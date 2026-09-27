import json
import logging
import re
import time
from typing import Dict, Any, List
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
            obj_match = re.search(r"(\{[\s\S]*\})", text)
            if obj_match:
                return json.loads(obj_match.group(1))
            raise

    def _call_fireworks_recommendation(
        self,
        prompt: str,
        start_time: float,
        privacy_mode: str,
        model_tier: str,
        redacted_fields: List[str],
    ) -> Dict[str, Any]:
        """Synthesize AI recommendation using LangChain ChatFireworks with minimax-m3."""
        api_key = settings.effective_fireworks_api_key
        if not api_key:
            raise RuntimeError("Fireworks AI API key is not configured (FIREWORRKS_API_KEY).")
        if not ChatFireworks:
            raise RuntimeError("langchain-fireworks is not installed.")

        logger.info(f"[Fireworks AI Recommender] Invoking backup model '{settings.fireworks_model}' via LangChain...")
        llm = ChatFireworks(
            model=settings.fireworks_model,
            fireworks_api_key=api_key,
            temperature=0.2,
        )
        messages = [
            SystemMessage(content=RECOMMENDATION_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]
        response = llm.invoke(messages)
        parsed = self._parse_json(response.content)

        return {
            "recommendation": parsed,
            "telemetry": {
                "provider": f"Fireworks AI ({settings.fireworks_model})",
                "model": settings.fireworks_model,
                "privacy_mode": privacy_mode,
                "input_tokens": 360,
                "output_tokens": 180,
                "estimated_cost": 0.0015,
                "latency_ms": int((time.time() - start_time) * 1000),
                "redacted_fields": redacted_fields or [],
                "model_tier": model_tier,
                "backup_used": True,
            },
        }

    def generate_recommendation(
        self,
        project_a: Dict[str, Any],
        project_b: Dict[str, Any],
        distance_meters: float,
        overlap_days: int,
        severity: str,
        corridor: str,
        privacy_mode: str = "public_only",
        model_tier: str = "standard",
    ) -> Dict[str, Any]:
        """
        Synthesizes an AI coordination recommendation from grounded deterministic facts with privacy filtering.
        """
        start_time = time.time()

        redacted_fields: List[str] = []
        proj_a_data = dict(project_a)
        proj_b_data = dict(project_b)
        active_corridor = corridor

        if privacy_mode == "redacted":
            def mask_name(val: str) -> str:
                words = str(val).split()
                return " ".join([w[0] + "█" * max(1, len(w) - 2) + (w[-1] if len(w) > 1 else "") for w in words])

            proj_a_data["name"] = mask_name(proj_a_data.get("name", "Project A"))
            proj_b_data["name"] = mask_name(proj_b_data.get("name", "Project B"))
            proj_a_data["description"] = "[REDACTED - Subsurface utility project scope]"
            proj_b_data["description"] = "[REDACTED - Subsurface utility project scope]"
            active_corridor = f"Grid-Cell Corridor Sector (~250m resolution)"
            redacted_fields = ["project_a.name", "project_b.name", "exact_corridor", "detailed_descriptions"]
        elif privacy_mode == "public_only":
            redacted_fields = ["exact_coordinates", "private_credentials", "personal_info"]

        model_to_use = "gemini-2.5-flash-lite" if model_tier == "lite" else self.model

        prompt = f"""CONFLICT DETAILS:
Severity: {severity}
Spatial Distance: {distance_meters} meters
Temporal Window Overlap: {overlap_days} calendar days
Shared Corridor / Location: {active_corridor}

PROJECT A:
Name: {proj_a_data.get('name')}
Utility: {proj_a_data.get('utilityName', 'Utility A')}
Type: {proj_a_data.get('projectType')}
Schedule: {proj_a_data.get('startDate')} to {proj_a_data.get('endDate')}
Description: {proj_a_data.get('description', 'N/A')}

PROJECT B:
Name: {proj_b_data.get('name')}
Utility: {proj_b_data.get('utilityName', 'Utility B')}
Type: {proj_b_data.get('projectType')}
Schedule: {proj_b_data.get('startDate')} to {proj_b_data.get('endDate')}
Description: {proj_b_data.get('description', 'N/A')}

Synthesize the coordination recommendation JSON:"""

        if model_tier == "fireworks":
            return self._call_fireworks_recommendation(
                prompt=prompt,
                start_time=start_time,
                privacy_mode=privacy_mode,
                model_tier=model_tier,
                redacted_fields=redacted_fields,
            )

        if not self.client:
            logger.warning("[Conflict Recommendation] Gemini Client not configured. Invoking LangChain Fireworks AI fallback...")
            try:
                return self._call_fireworks_recommendation(
                    prompt=prompt,
                    start_time=start_time,
                    privacy_mode=privacy_mode,
                    model_tier=model_tier,
                    redacted_fields=redacted_fields,
                )
            except Exception as fw_err:
                logger.error(f"[Conflict Recommendation] Fireworks AI fallback failed: {fw_err}")
                fb = self._fallback_recommendation(proj_a_data, proj_b_data, distance_meters, overlap_days, severity, active_corridor)
                return {
                    "recommendation": fb,
                    "telemetry": {
                        "provider": "Local Deterministic Synthesis",
                        "model": "rule-based-engine",
                        "privacy_mode": privacy_mode,
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "estimated_cost": 0.0,
                        "latency_ms": int((time.time() - start_time) * 1000),
                        "redacted_fields": redacted_fields,
                        "model_tier": model_tier,
                        "backup_used": True,
                    },
                }

        try:
            config = types.GenerateContentConfig(
                system_instruction=RECOMMENDATION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
            )

            response = self.client.models.generate_content(
                model=model_to_use,
                contents=prompt,
                config=config,
            )

            parsed = self._parse_json(response.text)

            input_tokens = 360
            output_tokens = 180
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                input_tokens = getattr(response.usage_metadata, "prompt_token_count", 360) or 360
                output_tokens = getattr(response.usage_metadata, "candidates_token_count", 180) or 180

            cost = 0.002 if model_tier == "lite" else 0.008

            return {
                "recommendation": parsed,
                "telemetry": {
                    "provider": "Google Vertex AI",
                    "model": model_to_use,
                    "privacy_mode": privacy_mode,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "estimated_cost": cost,
                    "latency_ms": int((time.time() - start_time) * 1000),
                    "redacted_fields": redacted_fields,
                    "model_tier": model_tier,
                },
            }
        except Exception as e:
            logger.warning(
                f"[Conflict Recommendation Failover] Gemini failed ({e}). Switching seamlessly to LangChain Fireworks AI ({settings.fireworks_model})..."
            )
            try:
                return self._call_fireworks_recommendation(
                    prompt=prompt,
                    start_time=start_time,
                    privacy_mode=privacy_mode,
                    model_tier=model_tier,
                    redacted_fields=redacted_fields,
                )
            except Exception as fw_err:
                logger.error(f"[Conflict Recommendation Failover] Fireworks AI fallback also failed: {fw_err}")
                fb = self._fallback_recommendation(proj_a_data, proj_b_data, distance_meters, overlap_days, severity, active_corridor)
                return {
                    "recommendation": fb,
                    "telemetry": {
                        "provider": "Local Deterministic Synthesis",
                        "model": "rule-based-engine",
                        "privacy_mode": privacy_mode,
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "estimated_cost": 0.0,
                        "latency_ms": int((time.time() - start_time) * 1000),
                        "redacted_fields": redacted_fields,
                        "model_tier": model_tier,
                        "backup_used": True,
                    },
                }

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

