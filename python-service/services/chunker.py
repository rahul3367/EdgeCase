"""
Fixed-size chunking with overlap, using tiktoken for token counting so
chunk sizes are consistent regardless of how verbose the source text is.

Strategy: 500-800 token chunks (default 700) with 100-token overlap so
clauses that straddle a chunk boundary still get retrieved with context
on both sides.
"""
from typing import List, TypedDict
import tiktoken

from config import CHUNK_SIZE_TOKENS, CHUNK_OVERLAP_TOKENS

# cl100k_base is a good general-purpose encoding; we're only using it to
# measure length, not to call a specific OpenAI model.
_encoding = tiktoken.get_encoding("cl100k_base")


class Chunk(TypedDict):
    id: str
    text: str
    page: int
    token_count: int


def chunk_pages(pages: List[tuple], document_id: str) -> List[Chunk]:
    """
    Args:
        pages: list of (page_number, page_text) from pdf_extractor
        document_id: used to build stable chunk ids

    Returns:
        List of Chunk dicts, each carrying the page it primarily came from.
    """
    chunks: List[Chunk] = []
    chunk_index = 0

    for page_number, text in pages:
        tokens = _encoding.encode(text)
        if not tokens:
            continue

        start = 0
        while start < len(tokens):
            end = min(start + CHUNK_SIZE_TOKENS, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = _encoding.decode(chunk_tokens)

            chunks.append(
                {
                    "id": f"{document_id}_chunk_{chunk_index}",
                    "text": chunk_text,
                    "page": page_number,
                    "token_count": len(chunk_tokens),
                }
            )
            chunk_index += 1

            if end == len(tokens):
                break
            # Move forward by (chunk size - overlap) so consecutive chunks
            # share CHUNK_OVERLAP_TOKENS tokens of context.
            start += CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS

    return chunks
