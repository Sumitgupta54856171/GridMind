import json
import logging
from typing import Dict, Any, List
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)

RECOMMENDATION_SYSTEM_PROMPT = """You are GridMind's Infrastructure Coordination AI Agent.
You analyze detected spatial and temporal construction conflicts between two public utility or infrastructure projects.
Your goal is to provide authoritative, actionable coordination recommendations that:
1. Prevent repeated street cuts and pavement moratorium violations.
2. Reduce traffic congestion and community disruption.
3. Enable joint trenching, co-location, or optimal sequencing.

You must output ONLY a valid JSON object with these EXACT keys:
- "summary": (string) One clear sentence summarizing the conflict.
- "whyItMatters": (string) 2-3 concise sentences explaining the real-world operational and public impact of this conflict.
- "recommendedActions": (array of objects) 2-4 concrete, prioritized coordination steps. Each object has:
    - "action": (string) Specific actionable title (e.g. "Joint Trenching Agreement", "Sequence Paving Post-Water Main", "Bi-Weekly Coordination Sync").
    - "rationale": (string) Engineering or operational justification.
    - "priority": (string) Must be one of: "high", "medium", "low".
- "confidence": (float between 0.70 and 0.98) Confidence score based on fact clarity.
- "limitations": (array of strings) Any missing data or caveats (e.g. "Exact burial depth not specified in public source").
"""

class GeminiRecommender:
    def __init__(self):
        try:
            self.client = genai.Client(
                vertexai=True,
                project=settings.project_id,
                location=settings.gemini_location,
            )
            self.model = settings.gemini_model
            logger.info("GeminiRecommender initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GeminiRecommender client: {e}")
            self.client = None

    def generate_recommendation(
        self,
        project_a: Dict[str, Any],
        project_b: Dict[str, Any],
        distance_meters: float,
        overlap_days: int,
        severity: str,
        corridor: str,
    ) -> Dict[str, Any]:
        """
        Synthesizes an AI coordination recommendation from grounded deterministic facts.
        """
        prompt = f"""CONFLICT DETAILS:
Severity: {severity}
Spatial Distance: {distance_meters} meters
Temporal Window Overlap: {overlap_days} calendar days
Shared Corridor / Location: {corridor}

PROJECT A:
Name: {project_a.get('name')}
Utility: {project_a.get('utilityName', 'Utility A')}
Type: {project_a.get('projectType')}
Schedule: {project_a.get('startDate')} to {project_a.get('endDate')}
Description: {project_a.get('description', 'N/A')}

PROJECT B:
Name: {project_b.get('name')}
Utility: {project_b.get('utilityName', 'Utility B')}
Type: {project_b.get('projectType')}
Schedule: {project_b.get('startDate')} to {project_b.get('endDate')}
Description: {project_b.get('description', 'N/A')}

Synthesize the coordination recommendation JSON:"""

        if not self.client:
            return self._fallback_recommendation(project_a, project_b, distance_meters, overlap_days, severity, corridor)

        try:
            config = types.GenerateContentConfig(
                system_instruction=RECOMMENDATION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )

            raw = response.text.strip()
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]

            parsed = json.loads(raw.strip())
            return parsed
        except Exception as e:
            logger.error(f"Gemini recommendation synthesis error: {e}", exc_info=True)
            return self._fallback_recommendation(project_a, project_b, distance_meters, overlap_days, severity, corridor)

    def _fallback_recommendation(
        self,
        project_a: Dict[str, Any],
        project_b: Dict[str, Any],
        distance_meters: float,
        overlap_days: int,
        severity: str,
        corridor: str,
    ) -> Dict[str, Any]:
        """Deterministic fallback if LLM is temporarily unreachable."""
        return {
            "summary": f"Spatial proximity ({distance_meters}m) and temporal overlap ({overlap_days} days) detected on {corridor}.",
            "whyItMatters": f"{project_a.get('name')} and {project_b.get('name')} are scheduled concurrently along {corridor}. Uncoordinated excavation risks cutting freshly resurfaced pavement and compounding roadway congestion.",
            "recommendedActions": [
                {
                    "action": "Joint Trenching & Utility Co-Location Review",
                    "rationale": "Combine excavation efforts to cut roadway pavement once, cutting mobilization costs and lane closure duration.",
                    "priority": "high" if severity == "HIGH" else "medium",
                },
                {
                    "action": "Sequence Roadway Work After Subsurface Installs",
                    "rationale": "Ensure deep water or conduit installations are completed and backfilled before surface paving begins.",
                    "priority": "high",
                },
                {
                    "action": "Coordinate Traffic Management & Lane Closures",
                    "rationale": "Harmonize detours across both agencies to prevent conflicting directional closures.",
                    "priority": "medium",
                },
            ],
            "confidence": 0.88,
            "limitations": ["Subsurface clearance profiles require field potholing verification."],
        }

gemini_recommender = GeminiRecommender()
