import json
from pathlib import Path
from threading import Lock

_METRICS_FILE = Path(__file__).parent / "metrics.json"
_lock = Lock()

def _load():
    if _METRICS_FILE.exists():
        with open(_METRICS_FILE, "r") as f:
            return json.load(f)
    return {}

def _save(metrics):
    with open(_METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=2)

def increment(key: str, delta: int = 1):
    with _lock:
        metrics = _load()
        metrics[key] = metrics.get(key, 0) + delta
        _save(metrics)

def get_all():
    with _lock:
        return _load()

def reset():
    with _lock:
        _save({})