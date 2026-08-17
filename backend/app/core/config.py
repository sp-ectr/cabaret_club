from urllib.parse import quote_plus
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # PostgreSQL (порт 5433 из твоего docker-compose.dev.yml)
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 5433
    DB_USER: str = "cabaret_user"
    DB_PASS: str = "cabaret_pass"
    DB_NAME: str = "cabaret_db"

    # Redis (порт 6380 из твоего docker-compose.dev.yml)
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6380

    # App
    CORS_ORIGINS: list[str] = ["*"]

    @property
    def postgres_async_url(self) -> str:
        user = quote_plus(self.DB_USER)
        password = quote_plus(self.DB_PASS)
        return f"postgresql+asyncpg://{user}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()