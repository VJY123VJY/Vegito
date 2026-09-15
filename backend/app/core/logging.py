import logging
import sys
import re

# Sensitive keys to mask in log messages
SENSITIVE_PATTERNS = [
    re.compile(r'(password[\'"]?\s*[:=]\s*[\'"]?)([^\'",\s]+)([\'"]?)', re.IGNORECASE),
    re.compile(r'(token[\'"]?\s*[:=]\s*[\'"]?)([^\'",\s]+)([\'"]?)', re.IGNORECASE),
    re.compile(r'(otp[\'"]?\s*[:=]\s*[\'"]?)([^\'",\s]+)([\'"]?)', re.IGNORECASE),
    re.compile(r'(secret[\'"]?\s*[:=]\s*[\'"]?)([^\'",\s]+)([\'"]?)', re.IGNORECASE),
]


class SensitiveFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern in SENSITIVE_PATTERNS:
                msg = pattern.sub(r'\1***REDACTED***\3', msg)
            record.msg = msg
        return True


def setup_logging(debug: bool = False) -> logging.Logger:
    log_level = logging.DEBUG if debug else logging.INFO
    logger = logging.getLogger("vegito")
    logger.setLevel(log_level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s:%(module)s:%(lineno)d] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveFilter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()
