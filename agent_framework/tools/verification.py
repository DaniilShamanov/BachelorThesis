import os, subprocess
import json
import logging
from typing import List
from langchain_core.tools import tool
from llm import llm
from utils import get_config, rate_limit_sleep
from prompts import get_test_validation_prompt, get_test_behavior_verification_prompt

logger = logging.getLogger(__name__)
config = get_config()

@tool
def lint_test_file(path: str) -> list[str]:
    """Run ESLint + Playwright plugin on a file. Returns a list of issues."""

    rate_limit_sleep()
    logger.info("Tool called: lint_test_file (path=%s)", path)
    try:
        result = subprocess.run(
            ["npx", "eslint", path, "--format", "json"],
            cwd=os.path.abspath(config["framework_base_path"]),
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode not in (0, 1):
            err = f"ESLint execution error: {result.stderr.strip()}"
            logger.warning(err)
            return [err]
        data = json.loads(result.stdout) if result.stdout else []
        issues = []
        for file_info in data:
            for msg in file_info.get("messages", []):
                issues.append(
                    f"{file_info['filePath']} line {msg['line']}: "
                    f"{msg['message']} ({msg.get('ruleId', '')})"
                )
        logger.info("lint_test_file found %d issues", len(issues))
        return issues
    except FileNotFoundError:
        logger.info("ESLint not installed; returning no issues")
        return []
    except Exception as e:
        logger.exception("lint_test_file failed")
        return [f"Lint error: {e}"]


@tool
def typescript_check(path: str = ".") -> list[str]:
    """
    Run TypeScript type checking on the framework folder.
    Gracefully handles missing tsc or npx.
    """
    logger.info("Tool called: typescript_check (path=%s)", path)
    try:
        result = subprocess.run(
            "npx tsc --noEmit",
            cwd=os.path.abspath(config["framework_base_path"]),
            capture_output=True,
            text=True,
            timeout=60,
            shell=True                        # needed on Windows
        )
        if result.returncode == 0:
            logger.info("TypeScript type check passed")
            return []
        errors = result.stdout.splitlines()
        logger.warning("TypeScript check found %d errors", len(errors))
        return errors[:20]
    except FileNotFoundError:
        logger.info("TypeScript compiler (tsc) not found – skipping check")
        return []
    except Exception as e:
        logger.exception("typescript_check failed")
        return [f"TypeScript check error: {e}"]


@tool
def validate_test_against_requirement(requirement: str, script: str) -> List[str]:
    """Semantic gap analysis: list missing assertions or logical flaws."""

    rate_limit_sleep()
    logger.info(
        "Tool called: validate_test_against_requirement (req len=%d, script len=%d)",
        len(requirement), len(script),
    )
    try:
        response = llm.invoke(get_test_validation_prompt(requirement, script))
        content = response.content.strip()
        if content.lower() == "none" or content == "":
            logger.info("Validation found no gaps")
            return []
        lines = [line.strip("- ").strip() for line in content.split("\n") if line.strip()]
        logger.info("Validation found %d issues", len(lines))
        return lines
    except Exception as e:
        logger.exception("validate_test_against_requirement failed")
        raise


@tool
def verify_test_behavior(requirement: str, execution_result: str) -> str:
    """
    Analyze the test's output and determine if it actually validates
    the requirement. Returns a summary of findings and any gaps.
    """
    
    logger.info(
        "Tool called: verify_test_behavior (req len=%d, exec result len=%d)",
        len(requirement), len(execution_result),
    )
    try:
        response = llm.invoke(get_test_behavior_verification_prompt(requirement, execution_result))
        content = response.content.strip()
        logger.info("verify_test_behavior returned: %s", content[:100])
        return content
    except Exception as e:
        logger.exception("verify_test_behavior failed")
        raise