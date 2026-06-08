import os
import subprocess
import shutil
import yaml
import time
from pathlib import Path

def get_config() -> dict:
    """
    Load config.yaml from the pipeline/ folder.
    The project root is assumed to be the current working directory
    (where main.py is run from). pipeline/ is a subfolder of that root.
    """

    config_path = os.path.join(Path.cwd(), "pipeline", "config.yaml")
    with open(config_path) as f:
        return yaml.safe_load(f)


def get_pipeline_dir() -> Path:
    """Return the absolute path to the pipeline/ folder."""

    return Path.cwd() / "pipeline"
    

def get_test_framework_path() -> str:
    """Return the normalized absolute path to the Playwright framework folder."""

    base = os.environ.get("THESIS_FW_PATH", get_config()["framework_base_path"])
    return os.path.normpath(os.path.abspath(base))


def rate_limit_sleep():
    """Sleep for the configured delay to stay within API rate limits."""
    
    config = get_config()
    delay = config.get("rate_limit_delay", 3)
    if delay > 0:
        time.sleep(delay)

    
def check_prerequisites(auto_install=False):
    """Check for required tools and optionally attempt to install missing ones."""
    
    issues = []
    if not shutil.which("node"):
        issues.append("Node.js is not found. Install from https://nodejs.org")
    if not shutil.which("npm"):
        issues.append("npm is not found (usually comes with Node.js).")
    if not shutil.which("npx"):
        issues.append("npx is not available (install Node.js / npm).")

    if issues:
        print("\nPrerequisite issues:")
        for i in issues:
            print(f"  - {i}")
        return False

    # Framework folder existence
    playwright_dir = os.environ.get("THESIS_FW_PATH", os.path.abspath("playwright"))
    if not os.path.isdir(playwright_dir):
        print(f"Framework directory '{playwright_dir}' not found.")
        print("It will be created when you use a profile or custom path.")
        return True

    # Check for Playwright browsers
    try:
        result = subprocess.run(
            "npx playwright install --dry-run",
            cwd=playwright_dir,
            capture_output=True,
            text=True,
            timeout=30,
            shell=True
        )
        if result.returncode != 0:
            print("Playwright browsers may be missing. Install with: npx playwright install")
    except Exception:
        print("Could not check Playwright browsers. Install with: npx playwright install")

    # Check for ESLint
    eslint_bin = os.path.join(
        playwright_dir, "node_modules", ".bin",
        "eslint.cmd" if os.name == "nt" else "eslint"
    )

    if not os.path.isfile(eslint_bin):
        print("ESLint not found in the framework folder.")
        print("You can install it with: npm install --save-dev eslint eslint-plugin-playwright")

    return True