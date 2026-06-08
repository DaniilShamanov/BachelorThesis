import logging
from tools import optimize_test_suite

logger = logging.getLogger(__name__)

def optimization_agent(state):
    """Run test suite optimisation (duplicate detection)."""

    logger.info("Optimization agent started")
    result = optimize_test_suite.invoke({"test_dir": None})
    
    return {"optimization_report": result}