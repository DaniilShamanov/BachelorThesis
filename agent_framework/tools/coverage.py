import os, re
import logging
from langchain_core.tools import tool
from typing import Optional
from utils import get_config

logger = logging.getLogger(__name__)
config = get_config()

@tool
def calculate_coverage(exploration_report: str, test_dir: Optional[str] = None) -> str:
    """
    Compare URLs found in an exploration report with those exercised by existing tests.
    Returns coverage percentage and a list of missing pages.
    """

    # Extract unique URLs from exploration report (simple heuristic)
    urls = set()
    for line in exploration_report.splitlines():
        match = re.search(r'(https?://[^\s]+)', line)
        if match:
            urls.add(match.group(1).rstrip('.,;:'))

    if not urls:
        return "No URLs found in exploration report."

    # Default test directory: framework's tests/ folder
    if test_dir is None:
        test_dir = os.path.abspath(config["framework_base_path"]) + "/tests"

    tested_urls = set()
    if os.path.isdir(test_dir):
        for root, _, files in os.walk(test_dir):
            for file in files:
                if file.endswith('.spec.ts') or file.endswith('.test.ts'):
                    with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                        content = f.read()
                    # Find page.goto('...') and request.newContext('...') calls
                    found = re.findall(r'page\.goto\([\'\"]([^\'\"]+)[\'\"]', content)
                    found += re.findall(r'request\.newContext\([\'\"]([^\'\"]+)[\'\"]', content)
                    for u in found:
                        tested_urls.add(u)

    covered = urls & tested_urls
    total = len(urls)
    covered_count = len(covered)
    pct = (covered_count / total * 100) if total else 0

    missing = sorted(urls - tested_urls)

    report = f"Coverage: {pct:.1f}% ({covered_count}/{total} pages tested)."
    if missing:
        report += f"\nMissing pages: {', '.join(missing[:10])}"
        if len(missing) > 10:
            report += f" ... and {len(missing)-10} more."
    return report