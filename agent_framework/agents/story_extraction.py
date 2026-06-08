import os
import logging
from tools import extract_user_stories

logger = logging.getLogger(__name__)

def story_extraction_node(state):
    """Extract user stories from the exploration report and save them to a file."""
    logger.info("Story extraction node started")
    report = state.execution_result or ""

    framework = os.environ.get("THESIS_FW_PATH", "playwright")
    output_file = os.path.join(framework, "test-results", "exploration_output.txt")

    if not report:
        if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8") as f:
                report = f.read()

    if not report:
        return {"generated_script": ""}

    stories = extract_user_stories.invoke({"report": report})
    logger.info("Extracted %d characters of user stories", len(stories))

    # Ensure test-results directory exists
    stories_dir = os.path.join(framework, "test-results")
    os.makedirs(stories_dir, exist_ok=True)

    stories_file = os.path.join(stories_dir, "user_stories.txt")
    with open(stories_file, "w", encoding="utf-8") as f:
        f.write(stories)

    return {"generated_script": stories}