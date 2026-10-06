from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="GridMind AI Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Normalize duplicate slashes in URL paths (e.g. //internal/extract -> /internal/extract)
@app.middleware("http")
async def normalize_slashes(request, call_next):
    if "//" in request.scope.get("path", ""):
        import re
        request.scope["path"] = re.sub(r"/+", "/", request.scope["path"])
    return await call_next(request)

app.include_router(api_router)

