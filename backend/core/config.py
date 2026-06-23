from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Bình Lợi Healing Journey API"
    environment: str = "development"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # PostgreSQL
    postgres_url: str = (
        "postgresql+asyncpg://binhloi_user:binhloi_secret@localhost:5432/binhloi"
    )

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection_locations: str = "locations"
    qdrant_collection_workshops: str = "workshops"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"  # supports Vietnamese

    # Groq
    groq_api_key: str = ""

    # Hugging Face
    hf_token: str = ""

    # Replicate
    replicate_token: str = ""

    # Facebook Graph API
    fb_app_id: str = ""
    fb_app_secret: str = ""

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    frontend_url: str = "http://localhost:5173"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()