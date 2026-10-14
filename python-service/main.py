import os
import shutil
import tempfile

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import PORT
from models.schemas import ProcessResponse, QueryRequest, QueryResponse, SourceChunk
from services import pdf_extractor, chunker, vector_store, rag_pipeline

app = FastAPI(title="Contract/Policy Loophole Finder - RAG Service")

# Allow the Node backend (and, during local dev, the browser directly) to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"success": True, "message": "Python RAG service is running"}


@app.post("/api/process", response_model=ProcessResponse)
async def process_document(file: UploadFile = File(...), document_id: str = Form(...)):
    """
    Full pipeline for a newly uploaded PDF:
    extract text -> chunk -> embed -> store in ChromaDB -> run risk classification.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Persist the upload to a temp file so PyMuPDF can open it by path
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        pages = pdf_extractor.extract_pages(tmp_path)
        if not pages:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from this PDF (it may be scanned/image-only).",
            )

        chunks = chunker.chunk_pages(pages, document_id)
        if not chunks:
            raise HTTPException(status_code=422, detail="Document produced no chunks.")

        embeddings = rag_pipeline.embed_chunks(chunks)
        vector_store.add_chunks(document_id, chunks, embeddings)

        try:
            risk_summary = rag_pipeline.process_document_for_risks(document_id, chunks)
        except Exception as e:
            print("Risk analysis failed:", e)
            risk_summary = None

        return ProcessResponse(
            chunksCount=len(chunks),
            collectionId=document_id,
            riskSummary=risk_summary,
        )
    finally:
        os.unlink(tmp_path)


@app.post("/api/query", response_model=QueryResponse)
async def query_document(payload: QueryRequest):
    history = [{"role": h.role, "content": h.content} for h in payload.history]
    result = rag_pipeline.answer_query(payload.document_id, payload.query, history)

    return QueryResponse(
        answer=result["answer"],
        sources=[SourceChunk(**s) for s in result["sources"]],
    )


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: str):
    vector_store.delete_collection(document_id)
    return {"success": True, "message": f"Collection for {document_id} deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
