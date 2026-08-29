import json
import logging
import time
from typing import Any, Dict


SENSITIVE_KEYS = {
    "password",
    "passwordhash",
    "apikey",
    "apisecret",
    "totpsecret",
    "secret",
    "token",
    "authorization",
    "cookie"
}


def sanitize(data: Any) -> Any:
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            k_lower = str(k).lower().replace("_", "").replace("-", "")
            if any(s in k_lower for s in SENSITIVE_KEYS) and not any(safe in k_lower for safe in ["status", "count", "type", "tier"]):
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = sanitize(v)
        return cleaned
    elif isinstance(data, list):
        return [sanitize(item) for item in data]
    return data


class Logger:
    def __init__(self, service_name: str = "Syncnode"):
        self.service_name = service_name

    def sanitize(self, data: Any) -> Any:
        return sanitize(data)

    def _log(self, level: str, message: str, meta: Dict[str, Any] = None):
        record = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "level": level,
            "service": self.service_name,
            "message": message
        }
        if meta:
            record["meta"] = sanitize(meta)
        print(json.dumps(record))

    def info(self, message: str, meta: Dict[str, Any] = None):
        self._log("INFO", message, meta)

    def warn(self, message: str, meta: Dict[str, Any] = None):
        self._log("WARN", message, meta)

    def error(self, message: str, meta: Dict[str, Any] = None):
        self._log("ERROR", message, meta)

    def debug(self, message: str, meta: Dict[str, Any] = None):
        self._log("DEBUG", message, meta)
