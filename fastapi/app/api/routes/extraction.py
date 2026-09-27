from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.extraction.gemini_extractor import gemini_extractor

router = APIRouter()

@router.post("/extract")
async def extract_projects_endpoint(
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None),
    source_type: str = Form("pdf"),
    utility_name: str = Form(""),
    service_area: str = Form(""),
):
    """
    Extracts structured projects from uploaded files (PDF, CSV, JSON) or text using Gemini AI Agent.
    """
    try:
        if file:
            content_bytes = await file.read()
            filename = (file.filename or "").lower()

            if filename.endswith(".pdf") or source_type == "pdf":
                projects = gemini_extractor.extract_from_pdf(
                    pdf_bytes=content_bytes,
                    utility_name=utility_name,
                    service_area=service_area,
                )
            else:
                try:
                    text = content_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    text = content_bytes.decode("latin-1", errors="replace")

                projects = gemini_extractor.extract_from_text(
                    text_content=text,
                    source_type=source_type,
                    utility_name=utility_name,
                    service_area=service_area,
                )
        elif text_content:
            projects = gemini_extractor.extract_from_text(
                text_content=text_content,
                source_type=source_type,
                utility_name=utility_name,
                service_area=service_area,
            )
        else:
            raise HTTPException(status_code=400, detail="Either file or text_content must be provided.")

        return {
            "status": "success",
            "total_extracted": len(projects),
            "projects": projects,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
