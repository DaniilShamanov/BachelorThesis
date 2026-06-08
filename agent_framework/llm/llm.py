import os
from langchain_anthropic import ChatAnthropic
from utils.cost_tracker import CostTrackingCallback
from utils.setup import get_config
from llm.rate_limited_llm import RateLimitedLLM

config = get_config()

raw_llm = ChatAnthropic(
    model=config["model_name"],
    api_key=os.path.expandvars(config["anthropic_api_key"]),
    temperature=0,
    callbacks=[CostTrackingCallback()]
)

llm = RateLimitedLLM(raw_llm, delay_seconds=config.get("rate_limit_delay", 15))



# later replace with below to provide robust llm with fallback models
#from robust_llm import RobustLLM

# Optionally accept user model from environment or config; for now, just default.
#user_model = None   # could be set from config.yaml if needed
#llm = RobustLLM(user_model=user_model)