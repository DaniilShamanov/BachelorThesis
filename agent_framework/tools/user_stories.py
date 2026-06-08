from langchain_core.tools import tool
from llm import llm
from prompts import get_story_generation_prompt
from utils import rate_limit_sleep

@tool
def extract_user_stories(report: str) -> str:
    """
    From an exploration report, extract a list of high‑level user stories
    (natural language requirements) that cover the discovered features.
    """
    
    rate_limit_sleep()
    response = llm.invoke(get_story_generation_prompt(report))
    return response.content.strip()