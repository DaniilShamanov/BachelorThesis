import logging
from state import AgentState, Intent
from tools import execute_playwright_test, execute_playwright_test_file, inject_context, verify_test_behavior

logger = logging.getLogger(__name__)

def execution_agent(state: AgentState) -> dict:
    logger.info("Execution agent started – intent=%s, test_id=%s, filter=%s",
                state.intent, state.test_identifier, state.test_filter)
    result = None

    if state.intent is Intent.EXECUTE:
        # If a filter or specific file is given, use that; otherwise run all
        if state.test_filter:
            pattern = state.test_filter
            if "|" in pattern or pattern.startswith("@"):
                file_cmd = f'--grep "{pattern}"'
            else:
                file_cmd = pattern
            result = execute_playwright_test_file.invoke({"path": file_cmd})
        elif state.test_identifier:
            result = execute_playwright_test_file.invoke({"path": state.test_identifier})
        else:
            # No filter, no specific file → run all tests
            result = execute_playwright_test_file.invoke({"path": ""})
        return_obj = {"execution_result": result, "generated_script": None}

    elif state.test_sequence:
        logger.info("Executing sequential test plan with %d steps", len(state.test_sequence))
        context = state.execution_context.copy()
        all_results = []
        for step in state.test_sequence:
            script = step["script"]
            script_with_ctx = inject_context.invoke({"script": script, "context": context})
            res = execute_playwright_test.invoke({"script": script_with_ctx})
            all_results.append(res)
            if "failed" in res.lower():
                return_obj = {
                    "execution_result": f"Sequence aborted: {res}",
                    "execution_context": context,
                    "generated_script": None
                }
                break
        else:
            return_obj = {
                "execution_result": "\n".join(all_results),
                "execution_context": context,
                "generated_script": None
            }
    else:
        script = state.generated_script
        if not script:
            logger.warning("No script to execute")
            return_obj = {"execution_result": "No script to execute."}
        else:
            logger.info("Executing generated script (len=%d)", len(script))
            context = state.execution_context
            res = execute_playwright_test.invoke({"script": script, "execution_context": context})
            return_obj = {"execution_result": res}

    if state.requirement and return_obj.get("execution_result"):
        logger.info("Running behavior verification")
        try:
            verif = verify_test_behavior.invoke({
                "requirement": state.requirement,
                "execution_result": return_obj["execution_result"]
            })
            return_obj["verification_result"] = verif
            logger.info("Verification result: %s", verif[:100])
        except Exception as e:
            logger.exception("Behavior verification failed")
            return_obj["verification_result"] = f"Verification error: {e}"

    return return_obj