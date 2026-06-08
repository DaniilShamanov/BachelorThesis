from typing import List

def get_test_validation_prompt(requirement: str, script: str) -> List[str]:
    return f"""
        Given the following test requirement and the generated Playwright test script,
        list any missing validations, uncovered scenarios, or logical gaps.
        Return a list of strings, one per issue. If the test fully covers the requirement, return an empty list.

        Requirement: {requirement}

        Test script: {script}

        Issues (list, or "None" if none):
    """


def get_test_behavior_verification_prompt(requirement: str, execution_result: str) -> str:
    return f"""
        You are a test quality analyst. Given a test requirement and the actual execution
        output (including console logs, errors, and assertions), determine whether the
        test truly verifies the requirement.

        Requirement:
        {requirement}

        Execution output:
        {execution_result}

        Respond with:
        - "PASS: <explanation>" if the test adequately validates the requirement.
        - "FAIL: <explanation>" if the test output indicates missing or incorrect validation.
        - "INCONCLUSIVE: <explanation>" if the output is insufficient to judge.
    """