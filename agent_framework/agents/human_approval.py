import logging
from state import AgentState

logger = logging.getLogger(__name__)

def human_approval_node(state: AgentState) -> dict:
    logger.info("Human approval node – showing generated script")
    print("\n" + "="*60)
    print("Generated script (first 600 chars):")
    print(state.generated_script[:600] if state.generated_script else "No script")
    print("="*60)
    while True:
        ans = input("Approve this script? (y/n): ").strip().lower()
        if ans == "y":
            logger.info("User approved")
            return {"approval_granted": True}
        elif ans == "n":
            logger.info("User rejected")
            return {"approval_granted": False}
        else:
            print("Please answer 'y' or 'n'")