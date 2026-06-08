from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from enum import Enum

class Intent(str, Enum):
    CREATE = "create_test"
    EXECUTE = "execute_test"
    EXPLORE = "explore"
    INGEST = "ingest"
    OPTIMIZE = "optimize"

class RepairAttempt(BaseModel):
    attempt: int
    error_signature: str
    script_before: Optional[str] = None
    script_after: Optional[str] = None
    fix_description: Optional[str] = None

class AgentState(BaseModel):
    intent: Intent = Intent.CREATE
    requirement: str = ""
    exploration_context: Dict[str, Any] = Field(default_factory=dict)
    test_identifier: Optional[str] = None
    require_human_approval: bool = False
    clone_url: Optional[str] = None
    clone_branch: Optional[str] = None
    generate_stories: bool = False
    calculate_coverage: bool = False
    coverage_report: Optional[str] = None
    browser_types: List[str] = Field(default_factory=lambda: ["chromium"])
    enable_optimization: bool = False
    enable_regression: bool = False
    exploration_urls: List[str] = Field(default_factory=list)
    optimization_report: Optional[str] = None
    regression_report: Optional[str] = None
    ingest_exploration: bool = False
    exploration_mode: str = "static"

    # Ingestion related
    ingest_paths: List[str] = Field(default_factory=list)
    ingest_options: Dict[str, Any] = Field(default_factory=dict)

    retrieved_steps: List[str] = Field(default_factory=list)
    generated_script: Optional[str] = None
    test_sequence: List[Dict[str, Any]] = Field(default_factory=list)
    test_type: Optional[str] = None
    test_filter: Optional[str] = None
    execution_context: Dict[str, Any] = Field(default_factory=dict)

    linting_errors: List[str] = Field(default_factory=list)
    validation_gaps: List[str] = Field(default_factory=list)
    execution_result: Optional[str] = None
    verification_result: Optional[str] = None

    repair_history: List[RepairAttempt] = Field(default_factory=list)
    max_repair_attempts: int = 3
    modified_files: List[str] = Field(default_factory=list)
    messages: List[Any] = Field(default_factory=list)