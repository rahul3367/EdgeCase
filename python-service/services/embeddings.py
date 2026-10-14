"""
Embedding generation via the Gemini embeddings API.

Uses google-generativeai's embed_content. Batches requests where possible
to reduce round trips. If GEMINI_API_KEY is missing, callers will get a
clear RuntimeError rather than a silent failure — better to fail loudly
at startup than mysteriously at query time.
"""
from typing import List
import google.generativeai as genai

from config import GEMINI_API_KEY, GEMINI_EMBEDDING_MODEL

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def _ensure_configured():
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to python-service/.env"
        )


def embed_texts(texts: List[str], task_type: str = "retrieval_document") -> List[List[float]]:
    """
    Embed a batch of texts.

    task_type:
        "retrieval_document" — for chunks being stored
        "retrieval_query"    — for the user's incoming question
    """
    _ensure_configured()

    embeddings: List[List[float]] = []
    for text in texts:
        result = genai.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            content=text,
            task_type=task_type,
        )
        embeddings.append(result["embedding"])

    return embeddings


def embed_query(text: str) -> List[float]:
    return embed_texts([text], task_type="retrieval_query")[0]
