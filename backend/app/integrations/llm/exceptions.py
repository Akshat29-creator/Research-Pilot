from typing import Any, Dict

from fastapi import status

from app.core.errors import AppException


class LLMError(AppException):
    """Base exception for all LLM integration errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_502_BAD_GATEWAY,
        code: str = "LLM_ERROR",
        details: Dict[str, Any] | None = None,
    ):
        super().__init__(message=message, status_code=status_code, code=code, details=details)


class LLMConnectionError(LLMError):
    """Raised when the LLM daemon (e.g. Ollama) is unreachable or fails to respond."""

    def __init__(
        self,
        message: str = "Host LLM daemon is unreachable.",
        details: Dict[str, Any] | None = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="LLM_CONNECTION_FAILED",
            details=details,
        )


class LLMModelNotFoundError(LLMError):
    """Raised when the requested model is not pulled or available in the daemon."""

    def __init__(self, model_name: str, available_models: list | None = None):
        super().__init__(
            message=f"Model '{model_name}' was not found on host Ollama instance.",
            status_code=status.HTTP_404_NOT_FOUND,
            code="LLM_MODEL_NOT_FOUND",
            details={"requested_model": model_name, "available_models": available_models or []},
        )


class LLMStructuredOutputError(LLMError):
    """Raised when the LLM output fails schema validation after the bounded repair retry."""

    def __init__(
        self,
        message: str = "LLM output failed schema validation after repair attempt.",
        raw_output: str | None = None,
        schema_name: str | None = None,
        validation_errors: str | None = None,
    ):
        super().__init__(
            message=message,
            status_code=422,
            code="LLM_SCHEMA_VALIDATION_FAILED",
            details={
                "schema_name": schema_name,
                "validation_errors": validation_errors,
                "raw_output_snippet": raw_output[:300] if raw_output else None,
            },
        )


class LLMTimeoutError(LLMError):
    """Raised when the LLM generation request exceeds the configured timeout."""

    def __init__(self, timeout_seconds: float, model_name: str):
        super().__init__(
            message=(
                f"LLM generation timed out after {timeout_seconds:.1f}s for model '{model_name}'."
            ),
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            code="LLM_TIMEOUT",
            details={"timeout_seconds": timeout_seconds, "model": model_name},
        )
