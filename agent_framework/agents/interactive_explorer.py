import re
import logging
import time
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import tool as lc_tool
from langchain.agents import create_agent
from state import AgentState
from llm import llm
from mcp_utils import MCPSessionSync
from utils import increment
from prompts import get_dynamic_exploration_prompt

logger = logging.getLogger(__name__)

def interactive_exploration_agent(state: AgentState) -> dict:
    logger.info("Interactive exploration agent started (browsers: %s, compact mode)", state.browser_types)

    browser = state.browser_types[0] if state.browser_types else "chromium"
    mcp = MCPSessionSync(browser=browser)
    mcp.start()

    max_depth = state.exploration_context.get("max_depth", 3)

    def _compact_snapshot() -> str:
        raw = mcp.call_tool_sync("browser_snapshot", {})
        url_match = re.search(r'^URL:\s*(.*)', raw, re.MULTILINE)
        title_match = re.search(r'^Title:\s*(.*)', raw, re.MULTILINE)
        headings = re.findall(r'heading\s+"([^"]+)"', raw, re.IGNORECASE)
        buttons = re.findall(r'button\s+"([^"]+)"', raw, re.IGNORECASE)
        links = re.findall(r'link\s+"([^"]+)"\s+url="([^"]+)"', raw, re.IGNORECASE)
        form_count = len(re.findall(r'form\s+', raw, re.IGNORECASE))

        parts = []
        if url_match:
            parts.append(f"URL: {url_match.group(1)}")
        if title_match:
            parts.append(f"Title: {title_match.group(1)}")
        if headings:
            parts.append("Headings: " + ", ".join(headings[:5]))
        if buttons:
            parts.append("Buttons: " + ", ".join(buttons[:10]))
        if links:
            parts.append("Links: " + ", ".join([f"{text} ({url})" for text, url in links[:10]]))
        parts.append(f"Forms: {form_count}")

        return "\n".join(parts) if parts else raw[:500]

    def act_and_compact(tool_name: str, params: dict, sleep_seconds: float = 4.0) -> str:
        mcp.call_tool_sync(tool_name, params)
        time.sleep(sleep_seconds)
        return _compact_snapshot()

    @lc_tool
    def browser_navigate(url: str) -> str:
        """Navigate to a URL and return a compact page summary."""
        return act_and_compact("browser_navigate", {"url": url})

    @lc_tool
    def browser_click(selector: str) -> str:
        """Click an element and return a compact page summary."""
        return act_and_compact("browser_click", {"selector": selector})

    @lc_tool
    def browser_fill(selector: str, value: str) -> str:
        """Fill a text field and return a compact page summary."""
        return act_and_compact("browser_fill", {"selector": selector, "value": value})

    @lc_tool
    def track_depth(current_depth: int) -> str:
        """Report the current exploration depth; warns if exceeded."""
        if current_depth > max_depth:
            return (
                f"DEPTH EXCEEDED: {current_depth} > {max_depth}. Do NOT follow any more links from this page."
            )
        return f"Depth {current_depth} recorded. Max allowed depth is {max_depth}."

    tools = [browser_navigate, browser_click, browser_fill, track_depth]
    agent = create_agent(model=llm, tools=tools, system_prompt=get_dynamic_exploration_prompt(max_depth))
    user_content = f"Exploration context: {state.exploration_context}. Requirement: {state.requirement}"
    messages = state.messages + [HumanMessage(content=user_content)]
    logger.debug("Starting compact interactive exploration")
    try:
        result = agent.invoke({"messages": messages})
        output = result["messages"][-1].content
        logger.info("Interactive exploration finished, output length=%d", len(output))
        increment("explorations.run")
    except Exception as e:
        logger.exception("Interactive exploration failed")
        raise
    finally:
        try:
            mcp.close()
        except Exception:
            pass

    return {
        "generated_script": output,
        "messages": state.messages + [HumanMessage(content=user_content), AIMessage(content=output)]
    }