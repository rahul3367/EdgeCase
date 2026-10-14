# Contract / Policy Loophole Finder

A RAG-based web app that analyzes contract and policy PDFs. It flags risky clauses (auto-renewal traps, one-sided termination rights, hidden penalties, unilateral changes) and lets you ask questions about the document in plain English. Answers are grounded in the document text and cite the page they came from.

## Features

- **PDF upload and viewer**: upload a contract and read it side by side with the analysis.
- **Risk analysis**: clauses are classified into five categories with a severity level and a plain-English explanation:
  - `renewal`: hidden or automatic renewals, unclear opt-out windows
  - `termination`: one-sided or strict termination rights
  - `penalty`: late fees, liquidated damages, interest
  - `one_sided`: indemnification, liability caps, unilateral changes
  - `payment`: risky payment terms, escalation clauses
- **Document Q&A chat**: ask questions like "What happens if I cancel early?" and get answers with page-level sources.
- **Chat history**: stored in MongoDB per document.

## Architecture

```
React (Vite)  ──►  Node / Express  ──►  FastAPI RAG service  ──►  Gemini API
 :5173              :5000                :8000                      (embeddings + LLM)
                      │                     │
                  MongoDB Atlas         ChromaDB (local)
              (documents, chat logs)    (chunk vectors)
```

| Layer | Stack | Role |
|---|---|---|
| `frontend/` | React, Vite, Tailwind CSS, react-pdf | Upload, PDF viewer, chat, risk panel |
| `backend/` | Node.js, Express, Mongoose | File upload, document and chat records, calls the RAG service |
| `python-service/` | FastAPI, PyMuPDF, ChromaDB, Google Gemini | PDF text extraction, chunking, embeddings, retrieval, risk analysis |

### How it works

1. **Upload**: the backend stores the PDF and sends it to the Python service.
2. **Process**: PyMuPDF extracts text per page, the text is split into overlapping token-based chunks, each chunk is embedded, and the vectors go into a per-document ChromaDB collection.
3. **Risk scan**: a sample of chunks is sent to Gemini with a structured prompt, which returns risky clauses as JSON.
4. **Chat**: the question is embedded, the top-k chunks are retrieved, and Gemini answers using only that context, returning the source chunks and pages.

## Prerequisites

- Node.js 20 or 22 LTS
- Python 3.12 (3.13 can lack prebuilt wheels for some dependencies)
- A MongoDB Atlas cluster, with your IP added under Network Access
- A Google Gemini API key from Google AI Studio

## Setup

### 1. Python service

```bash
cd python-service
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

Create `python-service/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_CHAT_MODEL=<a generateContent model your key can use>
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
```

Model names change over time. To list the models your key can use:

```bash
python -c "import google.generativeai as genai, config; genai.configure(api_key=config.GEMINI_API_KEY); [print(m.name, m.supported_generation_methods) for m in genai.list_models()]"
```

Run it:

```bash
uvicorn main:app --port 8000 --reload
```

Check: http://127.0.0.1:8000/docs

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
PYTHON_SERVICE_URL=http://localhost:8000
```

Run it:

```bash
npm run dev
```

Check: http://localhost:5000/api/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Keep all three services running.

## Usage

1. Open the app and upload a text-based PDF.
2. Wait for the status badge to change from `processing` to `ready`.
3. Review the flagged clauses in the risk panel.
4. Ask questions about the document in the chat.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `pydantic_core` import error | Broken venv. Delete `venv`, recreate it with Python 3.12, and reinstall. |
| Backend can't connect to MongoDB, or SSL alert 80 | Your IP isn't in Atlas Network Access, or the cluster is paused. Add your current IP and restart the backend. |
| Upload status `failed` | Read the traceback in the Python terminal. Usually a retired Gemini model name or a bad API key. |
| `429 RESOURCE_EXHAUSTED` | Free-tier Gemini rate limit. Wait a minute, use a lighter model, or enable billing. |
| `No extractable text` | The PDF is scanned. Text extraction needs a text-based PDF (OCR is not included). |
| PDF viewer shows "Failed to load PDF file" | pdf.js worker not loaded. Use the bundled worker (`pdfjs-dist/build/pdf.worker.min.mjs`) instead of a CDN URL. |
| Chat or search errors after changing the embedding model | Old vectors don't match the new model. Delete `python-service/chroma_data` and re-upload. |

## Security notes

- Keep `.env` files out of git. Commit only `.env.example` files with placeholder values.
- If a credential was ever committed or shared, rotate it.
- Don't leave Atlas open to `0.0.0.0/0` outside local testing.

## Limitations

- The risk scan samples up to about 20 chunks, so very long documents may have clauses that are not analyzed.
- Scanned PDFs are not supported.
- Output is generated by an LLM and is **not legal advice**. Always have important contracts reviewed by a qualified professional.

## Possible improvements

- Batch the embedding requests to speed up uploads and reduce API usage
- Scan the whole document in batches and merge the results
- OCR support for scanned PDFs
- Highlight a flagged clause directly in the PDF viewer
- Authentication and per-user document libraries
- Move to the newer `google-genai` SDK

[Demo Video](https://drive.google.com/file/d/1CHyiiIk-HqdWsS8pzNFYsAWGX5CyjEFK/view?usp=sharing)