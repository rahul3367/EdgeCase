const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { pythonServiceUrl } = require("../config/config");

const client = axios.create({
  baseURL: pythonServiceUrl,
  timeout: 120000, // PDF parsing + embedding can take a while
});

/**
 * Sends a PDF file to the Python microservice for extraction, chunking,
 * embedding, and storage in ChromaDB.
 * @param {string} filePath - absolute path to the uploaded PDF on disk
 * @param {string} documentId - Mongo _id of the Document, used as the
 *                               ChromaDB collection identifier
 */
async function processDocument(filePath, documentId) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("document_id", documentId);

  const response = await client.post("/api/process", form, {
    headers: form.getHeaders(),
  });

  return response.data; // { chunksCount, collectionId, riskSummary, ... }
}

/**
 * Sends a chat query for a given document to the RAG endpoint.
 * @param {string} documentId
 * @param {string} query
 * @param {Array} history - prior chat turns for context, [{role, content}]
 */
async function queryDocument(documentId, query, history = []) {
  const response = await client.post("/api/query", {
    document_id: documentId,
    query,
    history,
  });

  return response.data; // { answer, sources, riskFlags? }
}

/**
 * Requests the Python service delete a document's ChromaDB collection
 * (used for cleanup if processing fails or a document is deleted).
 */
async function deleteCollection(documentId) {
  const response = await client.delete(`/api/documents/${documentId}`);
  return response.data;
}

module.exports = { processDocument, queryDocument, deleteCollection };
