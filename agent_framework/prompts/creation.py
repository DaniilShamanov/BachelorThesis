def get_creation_prompt(framework_base_path: str, base_url: str = "", test_type: str = "ui") -> str:
    base_url_block = ""
    if base_url:
        base_url_block = f"""
            The target application base URL is {base_url}.
            Use environment variables (process.env.BASE_URL, process.env.TEST_USERNAME, process.env.TEST_PASSWORD) for configuration.
        """

    if test_type == "api":
        specific_instructions = f"""
            You are generating a test that exercises REST API endpoints.
            Use Playwright's `request.newContext()` to create an HTTP client.
            Make HTTP requests (GET, POST, PUT, DELETE) to the specified endpoints.
            Assert on status codes, response headers, and response bodies (JSON or text).
            Do NOT use browser page objects or UI interactions.
            All test logic must be pure HTTP requests and assertions on responses.
            Store the test file in the tests/ folder with a `.spec.ts` extension.
        """
    else:
        specific_instructions = f"""
            Generate a complete Playwright framework using Page Object Model (POM).
            All files must be placed inside the folder '{framework_base_path}'.
            For example: '{framework_base_path}/tests/login.spec.ts' or '{framework_base_path}/pages/LoginPage.ts'.
            The page objects must contain fine‑grained, atomic methods (e.g., `enterUsername`, `enterPassword`, `clickLoginButton`).
            Each method must have a comment immediately above it that states which requirement step it implements (e.g., `// Implements: "enter username"`).
            IMPORTANT: Do NOT use constructor‑assigned locator fields. Instead, define all selectors as `private static readonly` string constants at the top of the class.
            For example: `private static readonly loginButton = 'button[data-testid="login"]';`.
            Then use them inside methods like `await this.page.locator(LoginPage.loginButton).click();`.
            Never import `Locator` from Playwright for page objects.
            In the test spec files, call these atomic methods to form larger user journeys.
        """

    return f"""
        You are a test automation codebase agent.
        First, retrieve relevant existing test patterns and file locations.
        Decide whether to update an existing file or create a new one.
        {specific_instructions}
        {base_url_block}
        Never use implicit any; always declare explicit types.
        After generating all files, lint, type‑check, and semantically validate each one, fixing any issues.
    """