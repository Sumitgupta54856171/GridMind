from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from app.services.ai.gemini_recommender import gemini_recommender

router = APIRouter()

class RecommendRequest(BaseModel):
    project_a: Dict[str, Any]
    project_b: Dict[str, Any]
    distance_meters: float = Field(default=50.0)
    overlap_days: int = Field(default=7)
    severity: str = Field(default="HIGH")
    corridor: str = Field(default="Shared Corridor")

@router.post("/recommend")
async def generate_recommendation_endpoint(payload: RecommendRequest):
    """
    Synthesizes AI explanation and actionable coordination options using Gemini AI.
    """
    try:
        recommendation = gemini_recommender.generate_recommendation(
            project_a=payload.project_a,
            project_b=payload.project_b,
            distance_meters=payload.distance_meters,
            overlap_days=payload.overlap_days,
            severity=payload.severity,
            corridor=payload.corridor,
        )
        return {"status": "success", "recommendation": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation synthesis failed: {str(e)}")
