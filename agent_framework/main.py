import os
import uuid
from graph import app
from state import AgentState, Intent
from utils import get_config, check_prerequisites, setup_logging, get_test_framework_path
from utils.metrics import get_all

def main():
    config = get_config()
    framework_base_path = os.path.abspath(get_test_framework_path())

    setup_logging(config)

    if not check_prerequisites():
        return

    print("Multi-Agent Test Automation System")
    intent_map = {
        "create": Intent.CREATE,
        "execute": Intent.EXECUTE,
        "explore": Intent.EXPLORE,
        "ingest": Intent.INGEST
    }

    while True:
        try:
            choice = input("\nIntent (create/execute/explore/ingest): ").strip().lower()
            if choice not in intent_map:
                print("Invalid intent.")
                continue

            intent = intent_map[choice]

            requirement = ""
            test_id = ""
            tag = ""
            exp_context = {}
            approval = False
            ingest_paths = []
            test_filter = None
            generate_stories = False
            calculate_cov = False
            mode = "static"
            ingest = False
            test_type = "ui"

            # --- Profile selection ---
            framework_base_path = get_test_framework_path()
            custom_path = input("Use a custom framework folder? (y/n): ").strip().lower()
            if custom_path == "y":
                user_path = input("Enter absolute or relative path: ").strip()
                if user_path:
                    os.makedirs(user_path, exist_ok=True)
                    framework_base_path = user_path
            else:
                profiles = config.get("profiles", {})
                if profiles:
                    print("Available profiles:")
                    for name, info in profiles.items():
                        desc = info.get("description", "")
                        print(f"  {name}: {desc}")
                    choice = input("Enter profile name (or press Enter for default): ").strip()
                    if choice and choice in profiles:
                        profile = profiles[choice]
                        framework_base_path = profile["path"]
                        base_url = profile.get("base_url", "")
                        if base_url:
                            os.environ["BASE_URL"] = base_url
                        credentials = profile.get("credentials", {})
                        if credentials.get("username"):
                            os.environ["TEST_USERNAME"] = credentials["username"]
                        if credentials.get("password"):
                            os.environ["TEST_PASSWORD"] = credentials["password"]
                    elif choice and choice not in profiles:
                        print("Profile not found, using default.")
            os.environ["THESIS_FW_PATH"] = os.path.abspath(framework_base_path)

            if intent == Intent.INGEST:
                paths_str = input("Paths (comma-separated files or dirs): ").strip()
                ingest_paths = [p.strip() for p in paths_str.split(",") if p.strip()]
                if not ingest_paths:
                    print("No paths provided. Skipping.")
                    continue
            elif intent in [Intent.CREATE, Intent.EXPLORE]:
                requirement = input("Enter requirement: ").strip()
                if intent == Intent.EXPLORE:
                    mode = input("Exploration mode (static/dynamic) [default: static]: ").strip().lower()
                    if mode not in ("static", "dynamic"):
                        mode = "static"
                    urls = input("URLs (comma-separated, * for wildcard): ").strip()
                    max_depth = input("Max depth (default 3): ").strip() or "3"
                    exp_context = {
                        "urls": [u.strip() for u in urls.split(",") if u.strip()],
                        "max_depth": int(max_depth)
                    }
                    generate_stories = input("Generate user stories from exploration report? (y/n): ").strip().lower() == "y"
                    calculate_cov = input("Calculate coverage after exploration? (y/n): ").strip().lower() == "y"
                    ingest = input("Save exploration results to knowledge base for future test creation? (y/n): ").strip().lower() == "y"
                elif intent == Intent.CREATE:
                    ttype = input("Test type (ui/api) [default: ui]: ").strip().lower()
                    if ttype not in ("ui", "api"):
                        ttype = "ui"
                    test_type = ttype
                approval = input("Require human review before applying changes? (y/n): ").strip().lower() == "y"
            elif intent == Intent.EXECUTE:
                test_id = input("Test file path (relative to framework root) or 'all' for all tests: ").strip()
                if test_id == "all":
                    test_id = ""

            # ----- Tag filtering for execute -----
            if intent is Intent.EXECUTE:
                if input("Filter by tags? (y/n): ").strip().lower() == "y":
                    from vectorstore import get_all_tags
                    all_tags = get_all_tags()
                    if all_tags:
                        print("\nAvailable tags:")
                        for t in all_tags:
                            print(f"  @{t['tag']} – in: {', '.join(t['files'])}")
                    else:
                        print("No tags found. Index your test suite first (use 'ingest' intent).")
                    tags_list = []
                    while True:
                        tag = input("Enter tag (leave empty to finish): ").strip()
                        if not tag:
                            break
                        tags_list.append(tag.lstrip("@"))
                    if tags_list:
                        test_filter = "|".join(tags_list)

            # ---------- build state ----------
            initial_state = AgentState(
                intent=intent,
                requirement=requirement,
                test_identifier=test_id,
                test_filter=test_filter,
                exploration_context=exp_context,
                exploration_mode=mode,
                require_human_approval=approval,
                ingest_paths=ingest_paths,
                ingest_options={},
                generate_stories=generate_stories,
                calculate_coverage=calculate_cov,
                ingest_exploration=ingest,
                test_type=test_type
            )

            thread_id = str(uuid.uuid4())
            graph_config = {"configurable": {"thread_id": thread_id}}
            final_state = app.invoke(initial_state, graph_config)

            if config.get("export_history", False):
                try:
                    history = list(app.get_state_history(graph_config))
                    serializable = []
                    for snapshot in history:
                        state_dict = dict(snapshot.values)
                        if "messages" in state_dict:
                            new_msgs = []
                            for m in state_dict["messages"]:
                                new_msgs.append({
                                    "type": type(m).__name__,
                                    "content": m.content
                                })
                            state_dict["messages"] = new_msgs
                        if "repair_history" in state_dict:
                            state_dict["repair_history"] = [
                                r.dict() if hasattr(r, "dict") else r
                                for r in state_dict["repair_history"]
                            ]
                        serializable.append(state_dict)
                    import json
                    filename = f"run_history_{thread_id}.json"
                    with open(filename, "w", encoding="utf-8") as f:
                        json.dump(serializable, f, indent=2, default=str)
                    print(f"Full run history exported to {filename}")
                except Exception as e:
                    print(f"History export failed (non‑critical): {e}")

            print("\n===== RESULT =====")
            if intent == Intent.EXPLORE:
                exec_out = final_state.get("execution_result", "")
                if not exec_out:
                    # Fallback: try to read the console output from the test results
                    test_results_dir = os.path.join(os.environ["THESIS_FW_PATH"], "test-results")
                    if os.path.isdir(test_results_dir):
                        # find the most recent console.log file
                        log_files = []
                        for root, dirs, files in os.walk(test_results_dir):
                            for file in files:
                                if file == "console.log":
                                    log_files.append(os.path.join(root, file))
                        if log_files:
                            newest = max(log_files, key=os.path.getmtime)
                            try:
                                with open(newest, "r", encoding="utf-8") as f:
                                    exec_out = f.read()
                            except Exception:
                                exec_out = ""
                if exec_out:
                    print("\n--- Exploration Report ---")
                    print(exec_out[:600], "..." if len(exec_out) > 600 else "")
                if final_state.get("generated_script"):
                    print("\n--- User Stories ---")
                    print(final_state["generated_script"][:600], "...")
            else:
                if final_state.get("generated_script"):
                    print("Generated script (first 300 chars):")
                    print(final_state["generated_script"][:300], "...\n")
                print("Execution result:", final_state.get("execution_result", "No execution"))

            if final_state.get("verification_result"):
                print("Verification:", final_state.get("verification_result"))
            if final_state.get("coverage_report"):
                print("\nCoverage Report:", final_state["coverage_report"])
            if final_state.get("repair_history"):
                print(f"Repairs attempted: {len(final_state['repair_history'])}")
            if final_state.get("modified_files"):
                print("Modified files:", final_state["modified_files"])

            m = get_all()
            print(f"Total tokens: {m.get('llm.total_tokens', 0)}")
            print(f"Total cost: ${m.get('llm.cost_dollars', 0):.4f}")
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()