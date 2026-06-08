import re
import logging
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage
from tools import classify_failure
from utils import increment
from state import AgentState, RepairAttempt
from prompts import get_repair_prompt
from llm import llm
from tools import (
    retrieve_relevant_chunks, query_file_index, save_reusable_pattern,
    read_file, replace_in_file, write_file, lint_test_file,
    validate_test_against_requirement, typescript_check
)

logger = logging.getLogger(__name__)

def repair_agent(state: AgentState) -> dict:
    logger.info("Repair agent started – attempt %d", len(state.repair_history) + 1)
    tools = [
        retrieve_relevant_chunks, query_file_index, save_reusable_pattern,
        read_file, replace_in_file, write_file,
        lint_test_file, typescript_check, validate_test_against_requirement
    ]
    
    failure_category = "other"
    try:
        failure_category = classify_failure.invoke({
            "execution_result": state.execution_result or ""
        })
    except Exception:
        pass

    logger.info("Failure classified as: %s", failure_category)
    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=get_repair_prompt(failure_category)
    )

    old_script = state.generated_script or ""
    history_parts = []
    for r in state.repair_history:
        parts = [
            f"Attempt {r.attempt}:",
            f"Error: {r.error_signature}",
        ]
        if r.script_before and r.script_after:
            parts.append(f"Script BEFORE repair:\n```\n{r.script_before}\n```")
            parts.append(f"Script AFTER repair:\n```\n{r.script_after}\n```")
        if r.fix_description:
            parts.append(f"Description: {r.fix_description}")
        history_parts.append("\n".join(parts))
    history_str = "\n\n".join(history_parts) if history_parts else "None"

    human_msg = (
        f"Requirement: {state.requirement}\n"
        f"Failing script (from file {state.modified_files[-1] if state.modified_files else 'unknown'}):\n"
        f"```\n{state.generated_script}\n```\n"
        f"Execution result:\n{state.execution_result}\n"
        f"Repair history (previous attempts):\n{history_str}"
    )

    messages = state.messages + [HumanMessage(content=human_msg)]
    result = agent.invoke({"messages": messages})
    diff_output = result["messages"][-1].content
    logger.info("Repair diff produced:\n%s", diff_output[:500])

    file_path = None
    old_snippet = None
    new_snippet = None

    old_match = re.search(r'OLD_STRING:\s*\n(.*?)\nNEW_STRING:', diff_output, re.DOTALL)
    new_match = re.search(r'NEW_STRING:\s*\n(.*?)\nFILE_PATH:', diff_output, re.DOTALL)
    file_match = re.search(r'FILE_PATH:\s*(.*)', diff_output)

    if old_match:
        old_snippet = old_match.group(1).strip()
    if new_match:
        new_snippet = new_match.group(1).strip()
    if file_match:
        file_path = file_match.group(1).strip()

    if not (old_snippet and new_snippet and file_path):
        logger.warning("Could not parse diff; treating whole output as new script")
        new_script = diff_output
        file_path = state.modified_files[-1] if state.modified_files else "playwright/tests/fixed.spec.ts"
        write_file.invoke({"path": file_path, "content": new_script})
    else:
        try:
            replace_in_file.invoke({"path": file_path, "old_str": old_snippet, "new_str": new_snippet})
            new_script = read_file.invoke({"path": file_path})
        except Exception as e:
            logger.exception("Failed to apply diff, falling back to writing whole file")
            new_script = diff_output
            write_file.invoke({"path": file_path, "content": new_script})

    attempt = RepairAttempt(
        attempt=len(state.repair_history) + 1,
        error_signature=failure_category,
        script_before=old_script,
        script_after=new_script,
        fix_description=f"Repair attempt for {failure_category}"
    )

    increment("repairs.attempted")
    
    return {
        "generated_script": new_script,
        "repair_history": state.repair_history + [attempt],
        "modified_files": state.modified_files + [file_path] if file_path else state.modified_files,
        "messages": state.messages + [HumanMessage(content=human_msg), AIMessage(content=new_script)]
    }