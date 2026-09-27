import uvicorn
from app.main import app  # noqa: F401

if __name__ == "__main__":
    from app.core.config import settings
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
