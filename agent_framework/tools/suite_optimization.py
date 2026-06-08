import os, re
from langchain_core.tools import tool
from utils import get_config

config = get_config()

@tool
def optimize_test_suite(test_dir: str = None) -> str:
    """
    Scan the test suite for near‑duplicate test blocks and suggest merging.
    """

    if test_dir is None:
        test_dir = os.path.abspath(config["framework_base_path"]) + "/tests"
    if not os.path.isdir(test_dir):
        return "Test directory not found."
    tests = []
    for root, _, files in os.walk(test_dir):
        for file in files:
            if file.endswith('.spec.ts') or file.endswith('.test.ts'):
                with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                    content = f.read()
                for match in re.finditer(r'test\([\'\"](.+?)[\'\"],\s*async\s*\(.*?\)\s*=>\s*{', content, re.DOTALL):
                    body_start = match.end()
                    body = content[body_start:].split("test(")[0]
                    tests.append({"name": match.group(1), "file": file, "body": body[:500]})
    if not tests:
        return "No test blocks found."
    duplicates = []
    for i in range(len(tests)):
        for j in range(i+1, len(tests)):
            t1 = tests[i]
            t2 = tests[j]
            words1 = set(t1["name"].lower().split())
            words2 = set(t2["name"].lower().split())
            if words1 and words2:
                sim = len(words1 & words2) / len(words1 | words2)
            else:
                sim = 0
            if sim > 0.8:
                duplicates.append((t1, t2, sim))
    if not duplicates:
        return "No duplicate tests detected."
    report = "Potential duplicate tests:\n"
    for (a, b, sim) in duplicates[:10]:
        report += f"  - '{a['name']}' in {a['file']} vs '{b['name']}' in {b['file']} (similarity {sim:.0%})\n"
    return report