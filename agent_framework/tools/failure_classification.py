from langchain.tools import tool
from llm import llm
from prompts import get_failure_classification_prompt
from utils import rate_limit_sleep

@tool
def classify_failure(execution_result: str) -> str:
    """
    Analyze a test failure output and return a short category label
    such as 'selector_not_found', 'timeout', 'assertion_error', 'network_error', or 'other'.
    """

    rate_limit_sleep()
    response = llm.invoke(get_failure_classification_prompt(execution_result))
    category = response.content.strip().lower()
    allowed = {"selector_not_found", "timeout", "assertion_error", "network_error"}
    
    return category if category in allowed else "other"