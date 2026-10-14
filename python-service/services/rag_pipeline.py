"""
Core RAG logic:
  1. process_document_for_risks() - runs once at upload time. Pulls a broad
     sample of chunks and asks Gemini to classify clauses into risk
     categories (renewal / termination / penalty / one_sided / payment).
  2. answer_query() - runs per chat message. Embeds the query, retrieves
     top-k chunks from ChromaDB, and asks Gemini to answer using only
     that context.
"""
import json
import re
import time
from typing import List, Dict, Any

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from config import GEMINI_API_KEY, GEMINI_CHAT_MODEL, RETRIEVAL_TOP_K
from services import vector_store
from services.embeddings import embed_query, embed_texts

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

_model = None


def _get_model():
    global _model
    if _model is None:
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to python-service/.env"
            )
        _model = genai.GenerativeModel(GEMINI_CHAT_MODEL)
    return _model


def _generate(prompt: str, retries: int = 4):
    """
    Calls Gemini and waits/retries on free-tier rate limits (429).
    retry=None turns off the SDK's own hidden retries, which would
    otherwise burn the per-minute quota before our backoff kicks in.
    """
    model = _get_model()
    for attempt in range(retries):
        try:
            return model.generate_content(
                prompt, request_options={"retry": None}
            )
        except ResourceExhausted:
            if attempt == retries - 1:
                raise
            wait = 20 * (attempt + 1)  # 20s, 40s, 60s
            print(f"[Gemini] Rate limited, retrying in {wait}s "
                  f"(attempt {attempt + 1}/{retries})")
            time.sleep(wait)


def _response_text(response) -> str:
    """response.text raises if the reply was blocked/empty; handle that."""
    try:
        return response.text
    except ValueError:
        return ""


def _extract_json(raw_text: str) -> Any:
    """
    Gemini sometimes wraps JSON in markdown fences despite instructions.
    Strip those before parsing, and fall back gracefully if parsing fails.
    """
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


RISK_CLASSIFICATION_PROMPT = """You are a contract-risk analysis assistant. You will be shown excerpts \
from a contract or policy document. Identify clauses that pose risk to the party signing/accepting \
this document (assume the reader is the counterparty, not the drafter).

Classify each risky clause you find into ONE of these categories:
- "renewal": hidden or automatic renewal clauses, unclear opt-out windows
- "termination": one-sided or unusually strict termination rights/notice periods
- "penalty": fees, penalties, liquidated damages, interest on late payment
- "one_sided": clauses that heavily favor one party (indemnification, liability caps, unilateral changes)
- "payment": ambiguous or risky payment terms, hidden costs, escalation clauses

For each risk found, provide:
- category (one of the five above)
- severity ("low", "medium", or "high")
- clause_excerpt (the relevant text, max ~40 words, quoted or lightly paraphrased from the source)
- explanation (plain-English, 1-2 sentences, explain WHY this is risky for a non-lawyer)
- page (page number if available, else null)

Respond with ONLY valid JSON in this exact shape, no markdown fences, no commentary:
{{
  "risks": [
    {{
      "category": "...",
      "severity": "...",
      "clause_excerpt": "...",
      "explanation": "...",
      "page": null
    }}
  ],
  "overall_risk_level": "low" | "medium" | "high"
}}

If you find no risky clauses in the provided text, return {{"risks": [], "overall_risk_level": "low"}}.

Document excerpts:
---
{context}
---
"""

QA_PROMPT = """You are a contract-analysis assistant helping a user understand a document they uploaded. \
Answer the user's question using ONLY the context excerpts below. If the answer isn't in the context, \
say so plainly rather than guessing. Keep answers concise and in plain English. When relevant, mention \
which clause or page the answer comes from.

Conversation so far:
{history}

Context excerpts from the document:
---
{context}
---

User question: {query}

Answer:"""


def process_document_for_risks(document_id: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Runs a risk-classification pass over a sample of the document's chunks.
    For very long documents, this samples up to ~20 chunks spread across
    the document rather than sending everything in one prompt.
    """
    sample = chunks
    max_chunks_for_summary = 20
    if len(chunks) > max_chunks_for_summary:
        step = len(chunks) / max_chunks_for_summary
        sample = [chunks[int(i * step)] for i in range(max_chunks_for_summary)]

    context = "\n\n".join(
        f"[Page {c['page']}] {c['text']}" for c in sample
    )

    prompt = RISK_CLASSIFICATION_PROMPT.format(context=context)

    response = _generate(prompt)
    raw = _response_text(response)
    parsed = _extract_json(raw)

    if parsed is None:
        # Fallback shape so the API contract never breaks even if the
        # model returns malformed JSON.
        return {"risks": [], "overall_risk_level": "low", "raw_model_output": raw}

    return parsed


def answer_query(document_id: str, query: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Standard RAG query: embed -> retrieve top-k -> generate grounded answer.
    """
    query_embedding = embed_query(query)
    results = vector_store.query(document_id, query_embedding, top_k=RETRIEVAL_TOP_K)

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    ids = results.get("ids", [[]])[0]
    distances = results.get("distances", [[]])[0]

    sources = []
    context_parts = []
    for i, text in enumerate(documents):
        page = metadatas[i].get("page") if i < len(metadatas) else None
        score = distances[i] if i < len(distances) else None
        sources.append(
            {
                "chunk_id": ids[i] if i < len(ids) else f"chunk_{i}",
                "text": text,
                "page": page,
                "score": score,
            }
        )
        context_parts.append(f"[Page {page}] {text}")

    context = "\n\n".join(context_parts) if context_parts else "(no relevant excerpts found)"

    # The backend already appended the current question to history; drop it
    # so the model doesn't see the same question twice.
    prior = list(history)
    if prior and prior[-1].get("role") == "user" and prior[-1].get("content") == query:
        prior = prior[:-1]
    history_text = "\n".join(f"{h['role']}: {h['content']}" for h in prior[-6:])

    prompt = QA_PROMPT.format(history=history_text, context=context, query=query)

    response = _generate(prompt)
    answer = _response_text(response).strip() or "Sorry, I couldn't generate an answer for that. Try rephrasing."

    return {"answer": answer, "sources": sources}


def embed_chunks(chunks: List[Dict[str, Any]]) -> List[List[float]]:
    """Convenience helper used by main.py during document processing."""
    return embed_texts([c["text"] for c in chunks], task_type="retrieval_document")