"""
Configuración de la aplicación HorecaSO.
Lee variables de entorno desde .env usando pydantic-settings.
"""

import os

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración cargada desde variables de entorno."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    SECRET_KEY_AUTH: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    GROQ_API_KEY: str = ""
    APP_NAME: str = "HorecaSO"
    APP_VERSION: str = "1.0.0"

    @model_validator(mode="after")
    def _groq_key_desde_os(self):
        if not (self.GROQ_API_KEY or "").strip():
            object.__setattr__(
                self,
                "GROQ_API_KEY",
                (os.getenv("GROQ_API_KEY", "") or "").strip(),
            )
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        """Lista de orígenes permitidos para CORS."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
