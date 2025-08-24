from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "postgresql://frightfate_user:spooky_password_123@localhost:5432/frightfate"
    secret_key: str = "your-super-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # GitHub Models Settings (replacing Gemini)
    github_token: str = ""
    openai_model: str = "openai/gpt-4o"  # or "openai/gpt-4o-mini" for faster/cheaper
    
    # Keep these for backward compatibility if needed
    gemini_api_key: str = ""  # deprecated
    gemini_model: str = ""    # deprecated

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()