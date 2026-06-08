def get_failure_classification_prompt(execution_result: str) -> str:
    return f"""
        You are a test failure classifier. Given the following test execution output,
        return ONLY a short category label that best describes the root cause.
        Choose from: selector_not_found, timeout, assertion_error, network_error, other.

        Execution output:
        {execution_result}

        Category:
    """