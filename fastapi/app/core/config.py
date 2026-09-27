from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = True
    environment: str = "development"
    express_url: str = "http://localhost:3001"
    project_id: str = "geometric-team-457805-j0"
    gemini_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"
    llm_provider: str = "gemini"
    llm_api_key: str = ""
    llm_model: str = "gemini-2.5-flash"

    # Fireworks AI Fallback Configuration (LangChain)
    fireworrks_api_key: str = ""
    fireworks_api_key: str = ""
    fireworks_model: str = "accounts/fireworks/models/minimax-m3"

    @property
    def effective_fireworks_api_key(self) -> str:
        return (self.fireworrks_api_key or self.fireworks_api_key or "").strip()

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

