import os, re
import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict, Any
from utils.setup import get_config

config=get_config()

embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=config["local_embedding_model"]
)

client = chromadb.PersistentClient(path=config["chroma_persist_dir"])

patterns_collection = client.get_or_create_collection(
    name=config["collection_patterns"],
    embedding_function=embed_fn
)

index_collection = client.get_or_create_collection(
    name=config["collection_index"],
    embedding_function=embed_fn
)

# ---------- Generic chunking for various file types ----------
def chunk_test_file(content: str, file_path: str) -> List[Dict[str, Any]]:
    """Split a test file (.spec.ts) into logical blocks."""
    chunks = []
    pattern = r"(test|describe)\(['\"](.+?)['\"],\s*.*?\n"
    matches = list(re.finditer(pattern, content, re.DOTALL))
    if not matches:
        chunks.append({"text": content, "metadata": {"file": file_path, "tag": "", "type": "test"}})
        return chunks
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        chunk_text = content[start:end]
        tag = match.group(2).strip()
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "file": file_path,
                "tag": tag,
                "type": "test" if match.group(1) == "test" else "suite"
            }
        })
    return chunks

def chunk_bdd_feature(content: str, file_path: str) -> List[Dict[str, Any]]:
    """Split a .feature file by Scenario."""
    chunks = []
    # Simple splitting by "Scenario:" keyword
    parts = re.split(r'\n\s*Scenario:', content)
    header = parts[0]
    for i, part in enumerate(parts[1:]):
        chunk_text = "Scenario:" + part
        # Try to extract scenario name
        name_match = re.search(r'^\s*(.+?)\n', part)
        tag = name_match.group(1).strip() if name_match else f"scenario_{i}"
        chunks.append({
            "text": chunk_text,
            "metadata": {"file": file_path, "tag": tag, "type": "bdd"}
        })
    return chunks

def chunk_document(content: str, file_path: str) -> List[Dict[str, Any]]:
    """Split markdown/text by sections (## headings) or paragraphs."""
    chunks = []
    # Split by headings
    sections = re.split(r'\n(?=#{1,3}\s)', content)
    for sec in sections:
        if not sec.strip():
            continue
        # Use first heading as tag, else file name
        heading_match = re.search(r'^#{1,3}\s+(.+)', sec, re.MULTILINE)
        tag = heading_match.group(1).strip() if heading_match else file_path
        chunks.append({
            "text": sec,
            "metadata": {"file": file_path, "tag": tag, "type": "doc"}
        })
    return chunks

def get_all_tags() -> list[dict]:
    """Return a list of unique tags with the file they appear in."""
    # Query the index collection; metadata contains 'tags'
    results = index_collection.get()
    tag_map = {}
    for meta in results.get("metadatas", []):
        tags = meta.get("tags", "")
        file = meta.get("file", "")
        for tag in tags.split(","):
            tag = tag.strip()
            if not tag:
                continue
            if tag not in tag_map:
                tag_map[tag] = set()
            tag_map[tag].add(file)
    # Convert to list of dicts
    tag_list = [{"tag": tag, "files": list(files)} for tag, files in tag_map.items()]
    return sorted(tag_list, key=lambda x: x["tag"])

def generic_chunker(file_path: str, content: str) -> List[Dict[str, Any]]:
    """Dispatch to appropriate chunker based on extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.ts', '.spec.ts', '.test.ts']:
        return chunk_test_file(content, file_path)
    elif ext == '.feature':
        return chunk_bdd_feature(content, file_path)
    elif ext in ['.md', '.txt', '.rst']:
        return chunk_document(content, file_path)
    else:
        # Fallback: store whole file
        return [{"text": content, "metadata": {"file": file_path, "tag": "", "type": "other"}}]

def ingest_artifacts(paths: List[str], options: Dict[str, Any] = None) -> str:
    """
    Process a list of file or directory paths, chunk and store in vector DB.
    Returns a summary of what was ingested.
    """
    if options is None:
        options = {}
    chunk_size = options.get("chunk_size", config["ingestion"].get("chunk_size", 1000))
    include_docs = options.get("include_docs", config["ingestion"].get("include_docs", True))
    include_bdd = options.get("include_bdd", config["ingestion"].get("include_bdd", True))

    allowed_extensions = {'.ts', '.spec.ts', '.test.ts'}
    if include_bdd:
        allowed_extensions.add('.feature')
    if include_docs:
        allowed_extensions.update({'.md', '.txt', '.rst', '.json', '.yaml', '.yml'})

    total_files = 0
    total_chunks = 0

    for path in paths:
        if os.path.isfile(path):
            files = [path]
        elif os.path.isdir(path):
            # Walk directory
            files = []
            for root, _, filenames in os.walk(path):
                for fn in filenames:
                    files.append(os.path.join(root, fn))
        else:
            continue

        for fpath in files:
            ext = os.path.splitext(fpath)[1].lower()
            if ext not in allowed_extensions:
                continue
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue
            chunks = generic_chunker(fpath, content)
            # Also store a full-file entry in index_collection for coarse search
            index_collection.add(
                documents=[content],
                metadatas=[{"file": fpath, "tags": "", "summary": ""}],
                ids=[fpath]
            )
            # Store chunks in patterns_collection
            for i, ch in enumerate(chunks):
                patterns_collection.add(
                    documents=[ch["text"]],
                    metadatas=[ch["metadata"]],
                    ids=[f"{fpath}#chunk{i}"]
                )
            total_files += 1
            total_chunks += len(chunks)

    return f"Ingested {total_files} files, {total_chunks} chunks into knowledge base."

def index_test_repository(test_dir: str = "../playwright/tests"):
    """(Legacy) quick index of Playwright test files. Now calls ingest_artifacts internally."""
    ingest_artifacts([test_dir])

def query_patterns(query: str, k: int = None) -> List[str]:
    k = k or config["max_retrieval_k"]
    results = patterns_collection.query(query_texts=[query], n_results=k)
    return results["documents"][0] if results["documents"] else []

def query_index(query: str, k: int = None) -> List[Dict[str, Any]]:
    k = k or config["max_retrieval_k"]
    results = index_collection.query(query_texts=[query], n_results=k)
    out = []
    if results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            out.append({"file": meta.get("file"), "content": doc})
    return out

def add_pattern(pattern: str, metadata: Dict[str, Any]):
    patterns_collection.add(
        documents=[pattern],
        metadatas=[metadata],
        ids=[f"pattern_{len(patterns_collection.get()['ids'])}"]
    )