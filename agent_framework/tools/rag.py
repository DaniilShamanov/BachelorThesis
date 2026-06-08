import logging
from typing import List, Dict, Any
from langchain_core.tools import tool
from vectorstore import query_patterns, query_index, add_pattern
from utils import increment

logger = logging.getLogger(__name__)

@tool
def retrieve_relevant_chunks(requirement: str) -> List[str]:
    """Find similar test code chunks and file paths."""

    logger.info("Tool called: retrieve_relevant_chunks (requirement len=%d)", len(requirement))
    try:
        chunks = query_patterns(requirement)
        logger.info("retrieve_relevant_chunks returned %d chunks", len(chunks))
        increment("rag.retrievals")
        if chunks:
            increment("rag.hits")
        return chunks
    except Exception as e:
        logger.exception("retrieve_relevant_chunks failed")
        raise


@tool
def query_file_index(requirement: str) -> List[Dict[str, Any]]:
    """Find existing test files related to a requirement."""

    logger.info("Tool called: query_file_index (requirement len=%d)", len(requirement))
    try:
        results = query_index(requirement)
        logger.info("query_file_index returned %d entries", len(results))
        return results
    except Exception as e:
        logger.exception("query_file_index failed")
        raise


@tool
def save_reusable_pattern(pattern: str, metadata: Dict[str, Any] = None) -> str:
    """Save a successful test pattern for future reuse."""
    
    logger.info("Tool called: save_reusable_pattern (pattern len=%d)", len(pattern))
    try:
        add_pattern(pattern, metadata or {})
        logger.info("Pattern saved successfully")
        return "Pattern saved."
    except Exception as e:
        logger.exception("save_reusable_pattern failed")
        raise