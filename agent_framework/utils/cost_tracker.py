import logging
from langchain_core.outputs import LLMResult
from langchain_core.callbacks import BaseCallbackHandler
from utils import increment

logger = logging.getLogger(__name__)

class CostTrackingCallback(BaseCallbackHandler):
    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        # Anthropic returns usage in response.llm_output["usage"]
        usage = None
        if response.llm_output:
            usage = response.llm_output.get("usage")
        if usage is None:
            return

        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)
        total_tokens = input_tokens + output_tokens

        # Anthropic pricing for claude‑sonnet‑4‑5‑20250929: $3/$15 per 1M tokens
        input_cost = (input_tokens / 1_000_000) * 3
        output_cost = (output_tokens / 1_000_000) * 15
        total_cost = input_cost + output_cost

        increment("llm.input_tokens", input_tokens)
        increment("llm.output_tokens", output_tokens)
        increment("llm.total_tokens", total_tokens)
        increment("llm.cost_dollars", round(total_cost, 6))

        logger.info("LLM call: %d in / %d out tokens, cost $%.5f", input_tokens, output_tokens, total_cost)