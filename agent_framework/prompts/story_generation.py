def get_story_generation_prompt(report: str) -> str:
    return f"""
        You are a requirements analyst. Given the following exploration report of a web application,
        generate a list of user stories in the format:
        - As a [user], I want to [action], so that [benefit].

        Cover the main features and flows discovered during exploration. Be concise and use natural language.
        Report:
        {report}

        User stories:
    """