import json
import logging
import io
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings

try:
    from langchain_fireworks import ChatFireworks
    from langchain_core.messages import SystemMessage, HumanMessage
except ImportError:
    ChatFireworks = None
    SystemMessage = None
    HumanMessage = None

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
        provider: str = "auto",
    ) -> List[Dict[str, Any]]:
        """Extracts projects from a PDF document using Gemini AI or Fireworks backup."""
        pdf_text = self._extract_text_from_pdf(pdf_bytes)

        prompt = f"""Utility Organization: {utility_name or 'Public Utility'}
Service Area / Region: {service_area or 'Municipal Area'}

DOCUMENT TEXT:
{pdf_text[:120000]}

Extract all utility construction projects from this document into a structured JSON array. Do not miss any projects."""

        if provider == "fireworks":
            return self._call_fireworks(prompt)
        return self._call_gemini(prompt)

    def extract_from_text(
        self,
        text_content: str,
        source_type: str = "text",
        utility_name: str = "",
        service_area: str = "",
        provider: str = "auto",
    ) -> List[Dict[str, Any]]:
        """Extracts projects from CSV, JSON, or plain text content using Gemini AI or Fireworks backup."""
        prompt = f"""Utility Organization: {utility_name or 'Public Utility'}
Service Area / Region: {service_area or 'Municipal Area'}
Source Format: {source_type.upper()}

DATA CONTENT:
{text_content[:120000]}

Extract all utility construction projects from this data into a structured JSON array. Do not miss any projects."""

        if provider == "fireworks":
            return self._call_fireworks(prompt)
        return self._call_gemini(prompt)

    def _parse_json(self, raw_text: str) -> Any:
        """Safely extracts JSON from model responses, handling codeblocks and thinking tags."""
        text = (raw_text or "").strip()
        if "```json" in text:
            text = text.split("```json", 1)[1]
            if "```" in text:
                text = text.split("```", 1)[0]
        elif "```" in text:
            text = text.split("```", 1)[1]
            if "```" in text:
                text = text.split("```", 1)[0]

        # Strip reasoning tags if present
        text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()

        try:
            return json.loads(text.strip())
        except Exception:
            # Fallback regex search for outermost array or object
            arr_match = re.search(r"(\[[\s\S]*\])", text)
            if arr_match:
                return json.loads(arr_match.group(1))
            obj_match = re.search(r"(\{[\s\S]*\})", text)
            if obj_match:
                return json.loads(obj_match.group(1))
            raise

    def _call_fireworks(self, user_prompt: str) -> List[Dict[str, Any]]:
        """Fallback project extraction using LangChain and Fireworks AI minimax-m3."""
        api_key = settings.effective_fireworks_api_key
        if not api_key:
            raise RuntimeError("Fireworks AI API key is not configured (FIREWORRKS_API_KEY).")
        if not ChatFireworks:
            raise RuntimeError("langchain-fireworks is not installed.")

        logger.info(f"[Fireworks AI Extractor] Invoking backup model '{settings.fireworks_model}' via LangChain...")
        llm = ChatFireworks(
            model=settings.fireworks_model,
            fireworks_api_key=api_key,
            temperature=0.1,
        )
        messages = [
            SystemMessage(content=EXTRACTION_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]
        response = llm.invoke(messages)
        parsed = self._parse_json(response.content)

        provider_tag = f"Fireworks AI ({settings.fireworks_model})"
        if isinstance(parsed, list):
            return self._normalize_projects(parsed, extraction_provider=provider_tag)
        elif isinstance(parsed, dict) and "projects" in parsed:
            return self._normalize_projects(parsed["projects"], extraction_provider=provider_tag)
        else:
            return []

    def _call_gemini(self, user_prompt: str) -> List[Dict[str, Any]]:
        if not self.client:
            logger.warning("Gemini Client is not configured. Invoking LangChain Fireworks AI fallback...")
            return self._call_fireworks(user_prompt)

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

            parsed = self._parse_json(response.text)
            if isinstance(parsed, list):
                return self._normalize_projects(parsed, extraction_provider="Google Vertex AI")
            elif isinstance(parsed, dict) and "projects" in parsed:
                return self._normalize_projects(parsed["projects"], extraction_provider="Google Vertex AI")
            else:
                return []
        except Exception as e:
            logger.warning(
                f"[Extraction Failover] Google Gemini failed: {e}. Switching seamlessly to LangChain Fireworks AI ({settings.fireworks_model})..."
            )
            try:
                return self._call_fireworks(user_prompt)
            except Exception as fw_err:
                logger.error(f"[Extraction Failover] Fireworks AI fallback also failed: {fw_err}")
                raise e

    def _normalize_projects(
        self,
        projects: List[Dict[str, Any]],
        extraction_provider: str = "Google Vertex AI",
    ) -> List[Dict[str, Any]]:
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
                    "provider": extraction_provider,
                    "model": settings.fireworks_model if "Fireworks" in extraction_provider else settings.gemini_model,
                    "confidence": float(p.get("confidence", 0.9)),
                },
                "rawFields": {k: v for k, v in p.items() if k not in ["name", "description", "geometry"]},
            })
        return normalized

gemini_extractor = GeminiExtractor()
