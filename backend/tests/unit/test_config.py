from app.core.config import Settings


def test_default_settings():
    test_settings = Settings()
    assert test_settings.PROJECT_NAME == "ResearchPilot AI"
    assert test_settings.ENVIRONMENT in ["development", "testing", "production"]
    assert test_settings.JWT_ALGORITHM == "HS256"
    assert test_settings.VRAM_WARN_THRESHOLD_MB == 5500
    assert test_settings.PRIMARY_MODEL == "qwen3:8b"
    assert test_settings.EMBEDDING_MODEL == "nomic-embed-text"


def test_cors_origins_parsing():
    settings_with_string = Settings(CORS_ORIGINS="http://localhost:3000,http://example.com")
    assert "http://localhost:3000" in settings_with_string.CORS_ORIGINS
    assert "http://example.com" in settings_with_string.CORS_ORIGINS
