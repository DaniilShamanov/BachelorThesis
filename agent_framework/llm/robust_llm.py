import yaml, os
from pathlib import Path
from typing import Optional, List, Dict

class RobustLLM:
    """
    Wrapper for a LangChain chat model that falls back across providers.
    Usage:
        llm = RobustLLM(user_model="anthropic:claude-sonnet-4-20250514")
        # It will try the user model first, then the fallback list from models.yaml.
    """
    
    def __init__(self, user_model: Optional[str] = None):
        self._models = self._load_models(user_model)
        self._current_idx = 0
        self._current_llm = None

    def _load_models(self, user_model: Optional[str]) -> List[Dict[str, str]]:
        models_path = Path(__file__).parent / "models.yaml"
        with open(models_path) as f:
            data = yaml.safe_load(f)
        fallback = data.get("fallback_models", [])
        if user_model:
            # Expect format "provider:model_name", e.g., "openai:gpt-4o"
            if ":" in user_model:
                provider, model = user_model.split(":", 1)
                user_entry = {"provider": provider.strip(), "model": model.strip()}
                # Prepend to fallback list (so it's tried first)
                return [user_entry] + fallback
            else:
                # Assume the whole string is a model name for Anthropic (backward compat)
                return [{"provider": "anthropic", "model": user_model}] + fallback
        return fallback

    def _create_llm(self, entry: Dict[str, str]):
        provider = entry["provider"]
        model = entry["model"]
        if provider == "anthropic":
            from langchain_anthropic import ChatAnthropic
            # Use API key from env
            return ChatAnthropic(model=model, temperature=0,
                                 api_key=os.getenv("ANTHROPIC_API_KEY"))
        elif provider == "openai":
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model=model, temperature=0,
                              api_key=os.getenv("OPENAI_API_KEY"))
        elif provider == "google":
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model=model, temperature=0,
                                          api_key=os.getenv("GOOGLE_API_KEY"))
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def _try_next(self):
        while self._current_idx < len(self._models):
            entry = self._models[self._current_idx]
            try:
                print(f"Trying model: {entry['provider']}:{entry['model']}")
                self._current_llm = self._create_llm(entry)
                # Perform a quick test invoke to catch authentication errors early
                self._current_llm.invoke("ping")  # will be ignored
                print("OK")
                return
            except Exception as e:
                print(f"Failed: {e}")
                self._current_idx += 1
        raise RuntimeError("All models failed.")

    def invoke(self, prompt, **kwargs):
        if self._current_llm is None:
            self._try_next()
        try:
            return self._current_llm.invoke(prompt, **kwargs)
        except Exception:
            # If call fails, try next model
            self._current_idx += 1
            self._current_llm = None
            return self.invoke(prompt, **kwargs)