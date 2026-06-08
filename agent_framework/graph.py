import logging
import sqlite3
from typing import Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from agents import ( 
    orchestrator, ingestion_agent, codebase_agent, 
    interactive_exploration_agent, execution_agent, repair_agent, human_approval_node, 
    story_extraction_node, coverage_agent, ingest_exploration_node,
    optimization_agent, regression_agent
)
from state import AgentState, Intent
from utils import get_config, get_pipeline_dir, get_test_framework_path

logger = logging.getLogger(__name__)

config = get_config()
framework_base_path = get_test_framework_path()

def build_graph() -> StateGraph:
    workflow = StateGraph(AgentState)

    logger.info("Building LangGraph workflow")

    workflow.add_node("orchestrator", orchestrator)
    workflow.add_node("ingestion_agent", ingestion_agent)
    workflow.add_node("codebase_agent", codebase_agent)
    workflow.add_node("interactive_exploration_agent", interactive_exploration_agent)
    workflow.add_node("execution_agent", execution_agent)
    workflow.add_node("repair_agent", repair_agent)
    workflow.add_node("human_approval", human_approval_node)
    workflow.add_node("story_extraction_node", story_extraction_node)
    workflow.add_node("coverage_agent", coverage_agent)
    workflow.add_node("ingest_exploration_node", ingest_exploration_node)
    workflow.add_node("optimization_agent", optimization_agent)
    workflow.add_node("regression_agent", regression_agent)

    workflow.set_entry_point("orchestrator")

    def route_orchestrator(state: AgentState) -> Literal["ingestion_agent", "codebase_agent", "execution_agent", "interactive_exploration_agent"]:
        if state.intent == Intent.INGEST:
            return "ingestion_agent"
        elif state.intent == Intent.EXPLORE:
            if state.exploration_mode == "dynamic":
                return "interactive_exploration_agent"
            else:
                return "codebase_agent"
        elif state.intent == Intent.CREATE:
            return "codebase_agent"
        else:
            return "execution_agent"

    workflow.add_conditional_edges("orchestrator", route_orchestrator, {
        "ingestion_agent": "ingestion_agent",
        "codebase_agent": "codebase_agent",
        "execution_agent": "execution_agent",
        "interactive_exploration_agent": "interactive_exploration_agent"
    })

    workflow.add_edge("ingestion_agent", END)

    def after_codebase(state: AgentState) -> Literal["execution_agent", "optimization_agent", "human_approval", "__end__"]:
        if state.enable_optimization:
            return "optimization_agent"
        if state.intent == Intent.EXPLORE:
            return "execution_agent"
        if state.intent == Intent.CREATE:
            return "__end__"
        if state.require_human_approval:
            return "human_approval"
        return "__end__"

    workflow.add_conditional_edges("codebase_agent", after_codebase, {
        "execution_agent": "execution_agent",
        "optimization_agent": "optimization_agent",
        "human_approval": "human_approval",
        "__end__": END
    })

    workflow.add_edge("optimization_agent", END)

    # ----- Post‑execution: story/coverage before ingestion -----
    def after_execution(state: AgentState) -> Literal["coverage_agent", "story_extraction_node", "ingest_exploration_node", "repair_agent", "__end__"]:
        if state.intent == Intent.EXPLORE:
            # coverage first, then stories, then ingestion (if enabled)
            if state.calculate_coverage:
                return "coverage_agent"
            if state.generate_stories:
                return "story_extraction_node"
            if state.ingest_exploration:
                return "ingest_exploration_node"
            return "__end__"
        # repair for other intents
        if state.execution_result and "failed" in state.execution_result.lower():
            if len(state.repair_history) < state.max_repair_attempts:
                return "repair_agent"
        return "__end__"

    workflow.add_conditional_edges("execution_agent", after_execution, {
        "coverage_agent": "coverage_agent",
        "story_extraction_node": "story_extraction_node",
        "ingest_exploration_node": "ingest_exploration_node",
        "repair_agent": "repair_agent",
        "__end__": END
    })

    def after_coverage(state: AgentState) -> Literal["story_extraction_node", "ingest_exploration_node", "__end__"]:
        if state.generate_stories:
            return "story_extraction_node"
        if state.ingest_exploration:
            return "ingest_exploration_node"
        return "__end__"

    workflow.add_conditional_edges("coverage_agent", after_coverage, {
        "story_extraction_node": "story_extraction_node",
        "ingest_exploration_node": "ingest_exploration_node",
        "__end__": END
    })

    def after_stories(state: AgentState) -> Literal["ingest_exploration_node", "__end__"]:
        if state.ingest_exploration:
            return "ingest_exploration_node"
        return "__end__"

    workflow.add_conditional_edges("story_extraction_node", after_stories, {
        "ingest_exploration_node": "ingest_exploration_node",
        "__end__": END
    })

    workflow.add_edge("ingest_exploration_node", END)

    # regression and optimization are not used here; kept for completeness
    def after_regression(state: AgentState) -> Literal["coverage_agent", "story_extraction_node", "__end__"]:
        if state.calculate_coverage:
            return "coverage_agent"
        if state.generate_stories:
            return "story_extraction_node"
        return "__end__"

    workflow.add_conditional_edges("regression_agent", after_regression, {
        "coverage_agent": "coverage_agent",
        "story_extraction_node": "story_extraction_node",
        "__end__": END
    })

    def after_human_approval(state: AgentState) -> Literal["execution_agent", "__end__"]:
        if state.approval_granted:
            return "execution_agent"
        else:
            return "__end__"

    workflow.add_conditional_edges("human_approval", after_human_approval, {
        "execution_agent": "execution_agent",
        "__end__": END
    })

    workflow.add_edge("repair_agent", "execution_agent")

    conn = sqlite3.connect(str(get_pipeline_dir() / "state.db"), check_same_thread=False)
    checkpointer = SqliteSaver(conn=conn)
    return workflow.compile(checkpointer=checkpointer)


app = build_graph()