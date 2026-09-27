import json
import logging
import io
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are GridMind's Infrastructure Project Extraction AI Agent.
Your job is to thoroughly analyze utility planning documents, capital improvement plans (CIP), spreadsheets, or public datasets, and extract EVERY planned, active, or future utility construction project.

Do NOT miss any project. Even if a project is mentioned briefly in a table or paragraph, extract it.

For each project, output a JSON object with these EXACT keys:
- "name": (string, required) Concise, descriptive project title.
- "description": (string) Scope of work, pipeline/conduit dimensions, materials, or rationale.
- "projectType": (string) Utility domain, e.g. "water", "wastewater", "electric", "gas", "telecom", "transportation", or "stormwater".
- "status": (string) Must be one of: "planned", "active", "completed", "unknown".
- "startDate": (string, ISO format YYYY-MM-DD or YYYY-MM-01 if day unknown, or null if not mentioned).
- "endDate": (string, ISO format YYYY-MM-DD or YYYY-MM-01 if day unknown, or null if not mentioned).
- "locationText": (string) Address, intersection, limits, or geographical area.
- "corridorName": (string) Primary street, corridor, or highway name.
- "coordinates": (array of 2 numbers [longitude, latitude] or null) Estimate approximate [lng, lat] coordinates if city/corridor is known, or null.
- "confidence": (float between 0.0 and 1.0) Confidence in extraction accuracy.

You must output ONLY a valid JSON array of project objects, with no conversational filler or markdown fences.
"""

class GeminiExtractor:
    def __init__(self):
        try:
            self.client = genai.Client(
                vertexai=True,
                project=settings.project_id,
                location=settings.gemini_location,
            )
            self.model = settings.gemini_model
            logger.info(f"GeminiExtractor initialized with project={settings.project_id}, model={self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Client: {e}")
            self.client = None

    def _extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF using pypdf / pdfplumber."""
        extracted_text = []
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for idx, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        extracted_text.append(f"--- Page {idx + 1} ---\n{text}")
                    # Extract tables as formatted text
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            cleaned_row = [str(c or "").strip() for c in row if c]
                            if cleaned_row:
                                extracted_text.append(" | ".join(cleaned_row))
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed, falling back to pypdf: {e}")
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text:
                        extracted_text.append(f"--- Page {idx + 1} ---\n{text}")
            except Exception as e2:
                logger.error(f"pypdf extraction failed: {e2}")

        return "\n\n".join(extracted_text)

    def extract_from_pdf(
        self,
        pdf_bytes: bytes,
        utility_name: str = "",
        service_area: str = "",
    ) -> List[Dict[str, Any]]:
        """Extracts projects from a PDF document using Gemini AI."""
        pdf_text = self._extract_text_from_pdf(pdf_bytes)

        prompt = f"""Utility Organization: {utility_name or 'Public Utility'}
Service Area / Region: {service_area or 'Municipal Area'}

DOCUMENT TEXT:
{pdf_text[:120000]}

Extract all utility construction projects from this document into a structured JSON array. Do not miss any projects."""

        return self._call_gemini(prompt)

    def extract_from_text(
        self,
        text_content: str,
        source_type: str = "text",
        utility_name: str = "",
        service_area: str = "",
    ) -> List[Dict[str, Any]]:
        """Extracts projects from CSV, JSON, or plain text content using Gemini AI."""
        prompt = f"""Utility Organization: {utility_name or 'Public Utility'}
Service Area / Region: {service_area or 'Municipal Area'}
Source Format: {source_type.upper()}

DATA CONTENT:
{text_content[:120000]}

Extract all utility construction projects from this data into a structured JSON array. Do not miss any projects."""

        return self._call_gemini(prompt)

    def _call_gemini(self, user_prompt: str) -> List[Dict[str, Any]]:
        if not self.client:
            raise RuntimeError("Gemini Client is not configured. Check PROJECT_ID in .env.")

        try:
            config = types.GenerateContentConfig(
                system_instruction=EXTRACTION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1,
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=config,
            )

            raw_text = response.text.strip()
            # Clean possible markdown block markers if model included them
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            parsed = json.loads(raw_text.strip())
            if isinstance(parsed, list):
                return self._normalize_projects(parsed)
            elif isinstance(parsed, dict) and "projects" in parsed:
                return self._normalize_projects(parsed["projects"])
            else:
                return []
        except Exception as e:
            logger.error(f"Gemini project extraction failed: {e}", exc_info=True)
            raise e

    def _normalize_projects(self, projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for p in projects:
            if not isinstance(p, dict) or not p.get("name"):
                continue

            # Ensure valid geometry if coordinates provided
            coords = p.get("coordinates")
            geometry = None
            if coords and isinstance(coords, (list, tuple)) and len(coords) >= 2:
                try:
                    lng = float(coords[0])
                    lat = float(coords[1])
                    geometry = {
                        "type": "Point",
                        "coordinates": [lng, lat],
                    }
                except (ValueError, TypeError):
                    geometry = None

            # Date formatting safeguard
            def clean_date(val):
                if not val or not isinstance(val, str):
                    return None
                val = val.strip()
                if re.match(r"^\d{4}-\d{2}-\d{2}", val):
                    return val[:10]
                elif re.match(r"^\d{4}-\d{2}$", val):
                    return f"{val}-01"
                elif re.match(r"^\d{4}$", val):
                    return f"{val}-01-01"
                return None

            normalized.append({
                "name": str(p.get("name", "")).strip(),
                "description": str(p.get("description", "")).strip(),
                "projectType": str(p.get("projectType", "utility")).strip(),
                "status": p.get("status") if p.get("status") in ["planned", "active", "completed", "unknown"] else "planned",
                "startDate": clean_date(p.get("startDate")),
                "endDate": clean_date(p.get("endDate")),
                "locationText": str(p.get("locationText", "")).strip(),
                "corridorName": str(p.get("corridorName", "")).strip(),
                "geometry": geometry,
                "locationConfidence": float(p.get("confidence", 0.8)),
                "extraction": {
                    "method": "llm",
                    "confidence": float(p.get("confidence", 0.9)),
                },
                "rawFields": {k: v for k, v in p.items() if k not in ["name", "description", "geometry"]},
            })
        return normalized

gemini_extractor = GeminiExtractor()
