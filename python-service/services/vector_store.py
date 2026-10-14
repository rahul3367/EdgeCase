"""
Thin wrapper around a local, persistent ChromaDB instance.

Each document gets its own collection, named after the Mongo document _id,
so retrieval never has to cross-filter between unrelated contracts.
"""
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings

from config import CHROMA_PERSIST_DIR

_client = chromadb.PersistentClient(
    path=CHROMA_PERSIST_DIR,
    settings=Settings(anonymized_telemetry=False),
)


def _collection_name(document_id: str) -> str:
    # Chroma collection names must be alnum/underscore/hyphen, 3-63 chars
    return f"doc_{document_id}"


def get_or_create_collection(document_id: str):
    return _client.get_or_create_collection(name=_collection_name(document_id))


def add_chunks(document_id: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
    """
    chunks: list of {id, text, page, token_count}
    embeddings: parallel list of embedding vectors
    """
    collection = get_or_create_collection(document_id)

    collection.add(
        ids=[c["id"] for c in chunks],
        embeddings=embeddings,
        documents=[c["text"] for c in chunks],
        metadatas=[{"page": c["page"], "token_count": c["token_count"]} for c in chunks],
    )


def query(document_id: str, query_embedding: List[float], top_k: int = 6):
    """Returns Chroma's raw query result dict (ids, documents, metadatas, distances)."""
    collection = get_or_create_collection(document_id)
    return collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )


def delete_collection(document_id: str):
    try:
        _client.delete_collection(name=_collection_name(document_id))
    except Exception:
        # Collection may not exist — treat as a no-op
        pass
