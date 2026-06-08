import logging
from tools import regression_detect

logger = logging.getLogger(__name__)

def regression_agent(state):
    """Compare current exploration report with a saved baseline."""

    logger.info("Regression detection agent started")
    report = state.execution_result or ""
    if not report:
        return {"regression_report": "No exploration report available."}
    result = regression_detect.invoke({"report": report, "name": "baseline"})
    
    return {"regression_report": result}