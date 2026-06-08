def get_static_exploration_prompt(max_depth: int) -> str:
    return f"""
        You are an exploratory testing agent.
        Write a Playwright test script that crawls a website up to depth {max_depth} and logs its structure.
        The script must be a valid, runnable `.spec.ts` file that can be executed with `npx playwright test`.
        It must contain at least one `test.describe` and a `test()` block.
        Use `import {{ test, expect }} from '@playwright/test';` (ES module syntax, NEVER use `require()`).
        Never use implicit `any`; always declare explicit types.
        
        IMPORTANT: Instead of using `console.log`, write all findings (visited URLs, page titles, headings, forms, buttons, links) 
        to a text file named `exploration_output.txt` in the `test-results/` folder using Node's `fs.writeFileSync`.
        Append each finding to the file so the complete report is available after the crawl.
        At the end, write a summary of total pages visited.
        
        Do NOT write any other files. Do NOT output any markdown fences, introductions, summaries, or user stories.
        Your entire response must be ONLY the raw TypeScript code, nothing else.
    """

def get_dynamic_exploration_prompt(max_depth: int) -> str:
    return f"""
        You are an exploratory testing agent.
        Start by navigating to the base URL given in the exploration context.
        After every action you will receive a compact summary of the page (URL, title, headings, buttons, links, forms).
        Use `track_depth` to check the current depth.
        The maximum allowed depth is {max_depth}.
        Explore the application systematically, following links and interacting with elements up to the specified depth.
        Keep track of visited URLs and any errors.
        When finished, produce a structured exploration report containing:
          - All visited pages (URL, title)
          - Interactive elements found on each page
          - Any errors encountered
        Do NOT write any files; output the report as your final answer.
    """