import os, re
from langchain_core.tools import tool
from utils import get_config

config = get_config()

@tool
def save_regression_baseline(report: str, name: str = "baseline") -> str:
    """Save the current exploration report as a regression baseline."""

    baseline_dir = os.path.abspath(config["regression"]["baseline_dir"])
    os.makedirs(baseline_dir, exist_ok=True)
    filepath = os.path.join(baseline_dir, f"{name}.txt")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report)

    return f"Baseline saved to {filepath}."


@tool
def regression_detect(report: str, name: str = "baseline") -> str:
    """Compare current exploration report with a saved baseline and list differences."""

    baseline_dir = os.path.abspath(config["regression"]["baseline_dir"])
    filepath = os.path.join(baseline_dir, f"{name}.txt")
    if not os.path.isfile(filepath):
        return "No baseline found."
    with open(filepath, "r", encoding="utf-8") as f:
        baseline = f.read()
    old_urls = set(re.findall(r'(https?://[^\s]+)', baseline))
    new_urls = set(re.findall(r'(https?://[^\s]+)', report))
    added = new_urls - old_urls
    removed = old_urls - new_urls
    summary = f"Regression analysis: {len(added)} new pages, {len(removed)} removed pages."
    if added:
        summary += f"\nAdded: {', '.join(added)}"
    if removed:
        summary += f"\nRemoved: {', '.join(removed)}"
        
    return summary