import os
import logging
import time
from utils import rate_limit_sleep
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

@tool
def read_file(path: str, start_line: int = 1, end_line: int = -1) -> str:
    """Read a portion of a file. If end_line = -1, reads to end.
    If the file does not exist, returns an error message instead of crashing."""
    
    logger.info("Tool called: read_file (path=%s, start=%d, end=%d)", path, start_line, end_line)
    try:
        with open(path, "r") as f:
            lines = f.readlines()
        if end_line == -1:
            end_line = len(lines)
        content = "".join(lines[start_line - 1 : end_line])
        logger.debug("Read %d characters from %s", len(content), path)
        return content
    except FileNotFoundError:
        logger.warning("File not found: %s", path)
        return f"Error: File not found – {path}"
    except Exception as e:
        logger.exception("read_file failed on %s", path)
        raise


@tool
def replace_in_file(path: str, old_str: str, new_str: str) -> str:
    """Replace an exact string in a file with a new one."""

    time.sleep(3) # for a timeout
    logger.info("Tool called: replace_in_file (path=%s)", path)
    try:
        with open(path, "r") as f:
            content = f.read()
        content = content.replace(old_str, new_str)
        with open(path, "w") as f:
            f.write(content)
        logger.info("replace_in_file succeeded on %s", path)
        return f"Replaced in {path}."
    except Exception as e:
        logger.exception("replace_in_file failed on %s", path)
        raise


@tool
def write_file(path: str, content: str) -> str:
    """Create a new file with the given content, creating folders if needed."""
    
    rate_limit_sleep()
    path = os.path.normpath(path)
    logger.info("Tool called: write_file (path=%s, content len=%d)", path, len(content))
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info("write_file created %s", path)
        return f"Created {path}."
    except Exception as e:
        logger.exception("write_file failed on %s", path)
        raise