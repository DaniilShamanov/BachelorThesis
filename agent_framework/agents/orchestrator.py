import logging
from state import AgentState, Intent

logger = logging.getLogger(__name__)

def orchestrator(state: AgentState) -> dict:
    """
    Route based on intent. No file reading – execution agent handles everything.
    """
    
    if state.intent == Intent.INGEST:
        return {}
    if state.intent in [Intent.CREATE, Intent.EXPLORE]:
        return {}
    if state.intent == Intent.EXECUTE:
        return {}
    
    return {}