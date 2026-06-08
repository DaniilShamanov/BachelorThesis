import logging
import json
import sys
from pathlib import Path
from datetime import datetime

class JSONLinesHandler(logging.Handler):
    """Write logs as JSON objects, one per line."""
    
    def __init__(self, file_path):
        super().__init__()
        self.file_path = Path(file_path)
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

    def emit(self, record):
        log_entry = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = str(record.exc_info[1])
        with open(self.file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, default=str) + "\n")

def setup_logging(config: dict):
    log_cfg = config.get("logging", {})
    level = getattr(logging, log_cfg.get("level", "INFO").upper(), logging.INFO)
    log_file = log_cfg.get("file", "logs/pipeline.log")

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers (in case of re‑configuration)
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)

    # Add JSON file handler
    json_handler = JSONLinesHandler(log_file)
    json_handler.setLevel(level)
    root_logger.addHandler(json_handler)

    # Also add a console handler for INFO and above (optional)
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    root_logger.addHandler(console)

    logging.info("Logging initialized (level=%s, file=%s)", log_cfg.get("level", "INFO"), log_file)