Multi-Agent Test Automation Pipeline

A multi-agent system that uses Large Language Models (LLMs), the Playwright testing framework, and the Model Context Protocol (MCP) to autonomously generate, execute, and maintain full-stack (UI and API) test suites from natural language requirements. The system orchestrates three primary agents -- an Orchestrator, a Retrieval-Augmented Codebase Agent, and an Execution Agent -- via a LangGraph state machine. A ChromaDB vector store provides long-term memory for test patterns and exploration results, enabling reuse and reducing code duplication.

Architecture

The pipeline is a LangGraph StateGraph with the following nodes:

Orchestrator -- detects user intent and routes the workflow

Codebase Agent -- generates/updates test code using RAG and tool calling

Execution Agent -- runs tests via the native Playwright runner or MCP

Repair Agent -- classifies failures and applies diff-based fixes

Human Approval -- optional review gate before execution

Story Extraction -- generates user stories from exploration reports

Coverage Agent -- page-level coverage analysis

Ingest Exploration -- stores exploration reports in ChromaDB

Optimization Agent -- detects near-duplicate test blocks

Regression Agent -- compares exploration results against a saved baseline

Interactive Exploration Agent -- MCP-based dynamic browser exploration (optional)

All communication flows through a shared AgentState object, checkpointed to SQLite after each step.

Prerequisites
Python 3.10+

Node.js 18+ (with npm/npx)

Git (optional, currently disabled)

Anthropic API key (Claude Sonnet 4.5, configurable)

At least 2 GB free RAM (for local embedding model)

Setup
Clone the repository and navigate to the thesis/ folder.

Install Python dependencies:

text
cd agents
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate         # Windows
pip install -r requirements.txt
Install Playwright browsers:

text
cd ../playwright
npm install
npx playwright install chromium
Create a .env file in agents/ with your Anthropic API key:

text
ANTHROPIC_API_KEY=sk-ant-...
(Optional) Install ESLint inside the Playwright folder for linting support:

text
cd playwright
npm install --save-dev eslint @playwright/eslint-plugin
Configuration
All settings are in agents/config.yaml. Key sections:

model_name -- the Claude model to use

profiles -- named environments with optional base URL and credentials

chroma_persist_dir -- path to the vector database

max_repair_attempts -- how many times the repair node can retry a failing test

parallel_exploration.max_workers -- maximum concurrent exploration sessions

browsers.available -- list of browser engines to support

Usage
Always run main.py from the project root (thesis/ folder):

text
python agents/main.py
The CLI will present an interactive menu. Supported intents:

explore
Discover the application surface by crawling a live URL.

Prompt: natural language description (e.g., "Explore the Parabank site")

Mode: static (cheap, one LLM call) or dynamic (MCP-based compact exploration)

Options: generate user stories, calculate coverage, save results to knowledge base

create
Generate UI or API tests from a natural language requirement.

Test type: ui or api

UI tests follow the Page Object Model with atomic methods and static selectors.

API tests use Playwright's request.newContext() and HTTP assertions.

The agent retrieves similar existing tests from ChromaDB before generation.

execute
Run tests directly.

Specify a file path (e.g., tests/login.spec.ts) or all for the entire suite.

Tag filtering is supported (after ingestion).

schedule
Run all tests matching a specific tag (e.g., smoke). The orchestrator fetches matching files from the index.

ingest
Load existing test files, BDD features, or markdown documentation into ChromaDB for future RAG retrieval.

optimize
Scan the test suite for near-duplicate test blocks and print a report.

Project Structure
text
agents/
  main.py                     CLI entry point
  graph.py                    LangGraph state machine
  state.py                    AgentState definition
  config.yaml                 global configuration
  requirements.txt
  prompts/                    system prompts for each agent
    creation.py
    exploration.py
    repair.py
  tools/                      tool implementations (grouped by domain)
    rag.py, file_system.py, linting.py, validation.py,
    playwright.py, git.py, coverage.py, user_stories.py,
    optimization.py, regression.py
  agents/                     agent node functions
    orchestrator.py, codebase_agent.py, execution_agent.py,
    repair_agent.py, interactive_explorer.py, ingestion_agent.py,
    story_extraction.py, coverage_agent.py, human_approval.py,
    optimization_agent.py, regression_agent.py, ingest_exploration_agent.py
  llm/                        LLM wrapper and cost tracker
  mcp/                        MCP session manager
  utils/                      helpers (config, metrics, logging)
  vectorstore.py              ChromaDB setup and retrieval
  dashboards/                 HTML dashboard generator
Tools
The agents have access to over 25 tools, including:

RAG: retrieve_relevant_chunks, query_file_index, save_reusable_pattern

File System: read_file, write_file, replace_in_file

Linting & Validation: lint_test_file, typescript_check, validate_test_against_requirement, verify_test_behavior

Failure Classification: classify_failure

Playwright Execution: execute_playwright_test, execute_playwright_test_file, inject_context

Exploration (MCP): browser_navigate, browser_click, browser_fill, browser_snapshot, track_depth

User Stories: extract_user_stories

Coverage: calculate_coverage

Optimization: optimize_test_suite

Regression: save_regression_baseline, regression_detect

All tools are decorated with @tool and automatically bound to the LLM.

Metrics and Dashboard
A CostTrackingCallback records LLM token usage and cost. Cumulative metrics (tests.created, tests.executed, tests.passed, tests.failed, rag.hits, repairs.attempted, etc.) are stored in metrics.json.

To generate a visual dashboard:

text
python agents/dashboards/generate_dashboard.py
This creates dashboard.html with summary cards and interactive charts.

Evaluation

The system is evaluated on the Parabank banking application (https://parabank.parasoft.com). The primary metrics are:

Test generation correctness (pass/fail after execution)

Duplication reduction (via controlled A/B experiment with/without RAG)

Page-level coverage (explored URLs exercised by tests)

LLM cost and pipeline latency

Refer to the thesis document for detailed methodology and results.

Future Work

Multi-model fallback (Claude, GPT-4o, Gemini) via robust_llm.py

Requirement-level coverage analysis

CI/CD integration (Docker container + GitHub Actions)

Web UI for non-technical users

Cross-browser test generation (Firefox, WebKit)

Automatic regression detection and notification