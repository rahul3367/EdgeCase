"""
PDF text extraction using PyMuPDF (fitz).
Returns a list of (page_number, text) tuples so downstream chunking can
retain page references for citation purposes.
"""
from typing import List, Tuple
import fitz  # PyMuPDF


def extract_pages(file_path: str) -> List[Tuple[int, str]]:
    """
    Extract text from every page of a PDF.

    Returns:
        List of (page_number, page_text) — page_number is 1-indexed.
    """
    pages = []
    doc = fitz.open(file_path)
    try:
        for i, page in enumerate(doc):
            text = page.get_text("text")
            # Normalize whitespace a bit — PDFs often have irregular spacing
            text = " ".join(text.split())
            if text.strip():
                pages.append((i + 1, text))
    finally:
        doc.close()

    return pages


def extract_full_text(file_path: str) -> str:
    """Convenience helper: concatenated text of the whole document."""
    pages = extract_pages(file_path)
    return "\n\n".join(text for _, text in pages)
