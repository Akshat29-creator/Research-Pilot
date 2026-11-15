import json
import re
from typing import Type

from pydantic import BaseModel


def strip_thinking_tags(text: str) -> str:
    """Strip Qwen3 / DeepSeek reasoning thoughts enclosed in <think>...</think> tags.

    Handles case-insensitive matches, multi-line blocks, and unclosed thinking tags.
    """
    if not text:
        return ""

    # Remove closed thinking tags
    cleaned = re.sub(r"(?is)<think>.*?</think>", "", text)

    # Handle unclosed trailing <think> tags if model response was truncated
    cleaned = re.sub(r"(?is)<think>.*$", "", cleaned)

    return cleaned.strip()


def extract_json_string(text: str) -> str:
    """Extract candidate JSON payload from raw LLM text output.

    Handles:
    - Markdown fenced code blocks (```json ... ``` or ``` ... ```)
    - Raw unescaped JSON objects ({...}) or arrays ([...])
    - Common LLM malformations like trailing commas before closing braces
    """
    if not text:
        return ""

    stripped = strip_thinking_tags(text).strip()

    # 1. Check for fenced code block: ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", stripped, re.IGNORECASE)
    if fence_match:
        candidate = fence_match.group(1).strip()
    else:
        # 2. Look for outermost matching curly braces {...}
        first_brace = stripped.find("{")
        last_brace = stripped.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            candidate = stripped[first_brace : last_brace + 1].strip()
        else:
            # 3. Look for outermost square brackets [...]
            first_bracket = stripped.find("[")
            last_bracket = stripped.rfind("]")
            if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
                candidate = stripped[first_bracket : last_bracket + 1].strip()
            else:
                candidate = stripped

    # 4. Clean trailing commas before closing curly braces or brackets (common LLM bug)
    candidate = re.sub(r",\s*([}\]])", r"\1", candidate)

    return candidate


def unwrap_json_payload(
    candidate_json: str, response_model: Type[BaseModel] | None = None
) -> str:
    """Unwrap common LLM nesting patterns (e.g. {"properties": {...}} wrappers)."""
    try:
        parsed = json.loads(candidate_json)
        if isinstance(parsed, dict):
            # If model echoed schema properties
            if "properties" in parsed and isinstance(parsed["properties"], dict):
                parsed = parsed["properties"]
            elif "data" in parsed and isinstance(parsed["data"], dict):
                parsed = parsed["data"]
            elif "result" in parsed and isinstance(parsed["result"], dict):
                parsed = parsed["result"]
            return json.dumps(parsed)
    except Exception:
        pass
    return candidate_json


def format_schema_prompt(response_model: Type[BaseModel]) -> str:
    """Generate prompt directives instructing model to output strictly conforming JSON."""
    schema = response_model.model_json_schema()
    schema_json = json.dumps(schema, indent=2)

    return (
        f"\n\nCRITICAL OUTPUT REQUIREMENT:\n"
        f"Format your response as a single valid JSON object strictly conforming to schema:\n"
        f"```json\n{schema_json}\n```\n"
        f"Important: Place all required fields directly at the root of the JSON object.\n"
        f"Do NOT nest them inside 'properties', 'definitions', or 'title'.\n"
        f"Do NOT include any commentary, explanations, or thinking blocks outside the JSON."
    )


def format_repair_prompt(raw_text: str, error_msg: str, response_model: Type[BaseModel]) -> str:
    """Generate bounded 1-shot repair prompt for correcting malformed JSON."""
    schema = response_model.model_json_schema()
    schema_json = json.dumps(schema, indent=2)

    return (
        f"The previous output failed JSON schema validation.\n\n"
        f"VALIDATION ERROR:\n{error_msg}\n\n"
        f"ORIGINAL INVALID OUTPUT:\n```\n{raw_text[:1000]}\n```\n\n"
        f"REQUIRED JSON SCHEMA:\n```json\n{schema_json}\n```\n\n"
        f"Please repair the JSON. Place all fields directly at the root of the object.\n"
        f"Do not wrap inside 'properties'. Output ONLY the valid JSON object."
    )
