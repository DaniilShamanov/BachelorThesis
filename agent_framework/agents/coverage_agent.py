import os
import logging
from tools.coverage import calculate_coverage
from utils.metrics import increment

logger = logging.getLogger(__name__)

def coverage_agent(state):
    """Calculate coverage using the exploration report (execution output)."""
    
    logger.info("Coverage node started")
    report = state.execution_result or ""

    if not report:
        framework = os.environ.get("THESIS_FW_PATH", "playwright")
        output_file = os.path.join(framework, "test-results", "exploration_output.txt")
        if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8") as f:
                report = f.read()

    if not report:
        return {"coverage_report": "No exploration report available."}

    result = calculate_coverage.invoke({"exploration_report": report})
    increment("coverage.checks")
    return {"coverage_report": result}