import os
import logging
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from llm import llm
from utils import increment, get_test_framework_path
from state import AgentState, Intent
from prompts import get_static_exploration_prompt, get_creation_prompt
from tools import (
    retrieve_relevant_chunks, query_file_index, save_reusable_pattern,
    read_file, replace_in_file, write_file, lint_test_file,
    validate_test_against_requirement, typescript_check
)

logger = logging.getLogger(__name__)

def codebase_agent(state: AgentState) -> dict:
    logger.info("Codebase agent started – requirement length=%d", len(state.requirement))
    tools = []

    if state.intent == Intent.EXPLORE:
        max_depth = state.exploration_context.get("max_depth", 3)
        system_prompt = get_static_exploration_prompt(max_depth)
    else:
        # Determine test type (ui or api), default to ui
        test_type = state.test_type or "ui"
        base_url = os.getenv("BASE_URL", "")
        framework_base_path = get_test_framework_path()
        system_prompt = get_creation_prompt(framework_base_path, base_url, test_type)
        tools = [
            retrieve_relevant_chunks, query_file_index, save_reusable_pattern,
            read_file, replace_in_file, write_file,
            lint_test_file, typescript_check, validate_test_against_requirement
        ]
        
    agent = create_agent(model=llm, tools=tools, system_prompt=system_prompt)
    user_content = state.requirement
    if state.intent == Intent.EXPLORE:
        user_content = (
            f"Exploration context: {state.exploration_context}. "
            f"Requirement: {state.requirement}"
        )

    messages = state.messages + [HumanMessage(content=user_content)]
    logger.debug("Invoking codebase agent with %d messages", len(messages))
    result = agent.invoke({"messages": messages})
    output = result["messages"][-1].content
    logger.info("Codebase agent generated output length=%d", len(output))
    increment("tests.created")
    
    return {
        "generated_script": output,
        "messages": state.messages + [HumanMessage(content=user_content), AIMessage(content=output)]
    }