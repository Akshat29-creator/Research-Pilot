import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """
    Format application log records as structured JSON envelopes.
    Includes timestamps in ISO 8601, log levels, request/execution IDs, and exceptions.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include request_id or execution_id if attached to log record
        if hasattr(record, "request_id"):
            log_payload["request_id"] = getattr(record, "request_id")
        if hasattr(record, "execution_id"):
            log_payload["execution_id"] = getattr(record, "execution_id")

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload)


def setup_logging(log_level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Reduce verbosity of third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
