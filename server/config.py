"""
Application configuration and environment settings.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PULSE_", case_sensitive=True)

    PROJECT_NAME: str = "PULSE Clinical Decision Support System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_PATH: Path = DATA_DIR / "pulse_cdss.db"
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH}"

    # Default model configuration
    LATENT_DIM: int = 16
    HIDDEN_DIM: int = 128
    TEMPORAL_MODEL: str = "recurrent"  # "recurrent" or "transformer"

    # Preloaded profiles automatically seeded if database is empty
    AUTO_SEED_DEMO_DATA: bool = True


settings = Settings()
