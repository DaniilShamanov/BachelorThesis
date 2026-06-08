import os, re
import subprocess
import logging
from typing import Dict, Any
from langchain.tools import tool
from utils import get_config, increment, rate_limit_sleep, get_test_framework_path

logger = logging.getLogger(__name__)
config = get_config()
framework_base_path = get_test_framework_path()

@tool
def execute_playwright_test(script: str, execution_context: dict = None) -> str:
    """
    Save the generated script as static_exploration.spec.ts, run it,
    read the exploration_output.txt file from test-results/, and return its contents.
    """
    
    rate_limit_sleep()
    logger.info("Tool called: execute_playwright_test (script len=%d)", len(script))
    try:
        if execution_context:
            context_injection = f"const testContext = {execution_context};\n"
            script = context_injection + script

        # Strip markdown fences
        match = re.search(r"```(?:\w+)?\s*\n(.*?)```", script, re.DOTALL)
        if match:
            script = match.group(1).strip()
        elif script.startswith("```") and script.endswith("```"):
            script = script[3:-3].strip()

        code_start = re.search(
            r"^(import\s|test\.describe\s*\(|test\s*\()", script, re.MULTILINE
        )
        if code_start:
            script = script[code_start.start():].strip()

        if "test(" not in script:
            return "[native runner] Error: The generated script does not contain any test() block."

        tests_dir = os.path.join(framework_base_path, "tests")
        os.makedirs(tests_dir, exist_ok=True)
        filepath = os.path.join(tests_dir, "static_exploration.spec.ts")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(script)

        logger.info("Exploration script saved to %s", filepath)

        # Use test-results folder (same level as tests) for the output file
        test_results_dir = os.path.join(framework_base_path, "test-results")
        os.makedirs(test_results_dir, exist_ok=True)
        output_file = os.path.join(test_results_dir, "exploration_output.txt")
        if os.path.exists(output_file):
            os.remove(output_file)

        cmd = "npx playwright test tests/static_exploration.spec.ts"
        logger.info("Running: %s", cmd)
        result = subprocess.run(
            cmd,
            cwd=os.path.abspath(framework_base_path),
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
            shell=True,
        )
        logger.info(
            "Native runner finished with returncode %d", result.returncode
        )

        # Read the exploration output file
        exploration_output = ""
        if os.path.exists(output_file):
            try:
                with open(output_file, "r", encoding="utf-8") as f:
                    exploration_output = f.read()
            except Exception as e:
                logger.warning("Could not read exploration output file: %s", e)

        # If the test failed and no output file was created, return the raw output
        if result.returncode != 0:
            logger.warning(
                "Playwright returned non-zero exit code: %d", result.returncode
            )
            if exploration_output:
                return f"[native runner] {exploration_output}"
            return f"[native runner] Test execution failed.\nStdout:\n{result.stdout}\nStderr:\n{result.stderr}"

        _count_test_results(exploration_output)
        increment("tests.executed")
        return f"[native runner] {exploration_output}"
    except Exception as e:
        logger.exception("execute_playwright_test failed")
        return f"Native runner error: {e}"

@tool
def execute_playwright_test_file(path: str) -> str:
    """
    Run an existing Playwright test file or pattern directly,
    without creating any temp files. Uses JSON reporter.
    """

    rate_limit_sleep()
    logger.info("Tool called: execute_playwright_test_file (path=%s)", path)
    try:
        framework_dir = os.path.abspath(config["framework_base_path"])
        report_file = os.path.join(framework_dir, "playwright-report.json")
        cmd = f"npx playwright test {path} --reporter json > {report_file}"
        logger.info("Running: %s", cmd)
        result = subprocess.run(
            cmd,
            cwd=framework_dir,
            capture_output=True, text=True, encoding="utf-8", timeout=300, shell=True,
        )
        output = result.stdout + "\n" + result.stderr
        logger.info("Native runner finished with returncode %d", result.returncode)
        summary = _parse_playwright_json_report(report_file)
        if summary:
            output += f"\n[Summary] Total: {summary['total']}, Passed: {summary['passed']}, Failed: {summary['failed']}, Skipped: {summary['skipped']}"
        _count_test_results(output)
        increment("tests.executed")
        return f"[native runner] {output}"
    except Exception as e:
        logger.exception("execute_playwright_test_file failed")
        return f"Native runner error: {e}"


@tool
def inject_context(script: str, context: Dict[str, Any]) -> str:
    """Merge a context dictionary into the script as a variable."""

    rate_limit_sleep()
    logger.info("Tool called: inject_context (script len=%d, context keys=%s)", len(script), list(context.keys()) if context else [])
    try:
        return f"const testContext = {context};\n{script}"
    except Exception as e:
        logger.exception("inject_context failed")
        raise


# ============= Helpers to parse test output =============
def _count_test_results(output: str):
    """Parse Playwright native runner output for passed/failed counts."""

    import re
    try:
        passed = re.search(r"(\d+)\s+passed", output)
        failed = re.search(r"(\d+)\s+failed", output)
        if passed:
            increment("tests.passed", int(passed.group(1)))
        if failed:
            increment("tests.failed", int(failed.group(1)))
    except Exception:
        pass

def _parse_playwright_json_report(report_file: str) -> dict:
    """Read a Playwright JSON report and return a summary dict."""
    
    import json
    try:
        with open(report_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        suites = data.get("suites", [])
        total = 0
        passed = 0
        failed = 0
        skipped = 0
        for suite in suites:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    total += 1
                    status = test.get("status", "unknown")
                    if status == "passed":
                        passed += 1
                    elif status == "failed":
                        failed += 1
                    elif status == "skipped":
                        skipped += 1
        return {"total": total, "passed": passed, "failed": failed, "skipped": skipped}
    except Exception:
        return {}