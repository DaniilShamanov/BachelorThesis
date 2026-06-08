import time
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from typing import Any, List, Optional

class RateLimitedLLM:
    """Wrapper that enforces a minimum interval between LLM calls."""
    def __init__(self, llm: BaseChatModel, delay_seconds: float):
        self._llm = llm
        self._delay = delay_seconds
        self._last_call = 0.0

    def invoke(self, messages: List[BaseMessage], **kwargs: Any) -> Any:
        # Wait if needed
        elapsed = time.time() - self._last_call
        if elapsed < self._delay:
            time.sleep(self._delay - elapsed)
        self._last_call = time.time()
        return self._llm.invoke(messages, **kwargs)

    # Delegate all other attribute lookups to the wrapped LLM
    def __getattr__(self, name: str):
        return getattr(self._llm, name)