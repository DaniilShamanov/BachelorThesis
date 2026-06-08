import logging
from state import AgentState
from utils import increment
from vectorstore import ingest_artifacts
from tools import save_reusable_pattern

logger = logging.getLogger(__name__)

def ingestion_agent(state: AgentState) -> dict:
    logger.info("Ingestion agent started – paths=%s", state.ingest_paths)
    summary = ingest_artifacts(state.ingest_paths, state.ingest_options)
    logger.info("Ingestion finished: %s", summary)
    increment("ingestions.run")

    return {"execution_result": summary}


def ingest_exploration_node(state: AgentState) -> dict:
    """Save the exploration report into the vector DB for future RAG."""
    
    logger.info("Ingest exploration node started")
    report = state.execution_result or ""
    if report:
        save_reusable_pattern.invoke({
            "pattern": report,
            "metadata": {"type": "exploration_report", "source": "exploration"}
        })
        logger.info("Exploration report saved to knowledge base")

    return {}