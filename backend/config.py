"""
Configuración de la aplicación HorecaSO.
Lee variables de entorno desde .env usando pydantic-settings.
"""

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
    GROQ_API_KEY: str = ""
    APP_NAME: str = "HorecaSO"
    APP_VERSION: str = "1.0.0"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Lista de orígenes permitidos para CORS."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
