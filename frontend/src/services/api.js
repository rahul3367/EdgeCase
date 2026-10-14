import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Uploads a PDF file. Returns the created Document record
 * (including chunksCount, status, riskSummary once processing finishes).
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

/** Fetches all uploaded documents. */
export async function getDocuments() {
  const { data } = await api.get("/documents");
  return data.data;
}

/** Fetches a single document by id (useful for polling processing status). */
export async function getDocument(documentId) {
  const { data } = await api.get(`/documents/${documentId}`);
  return data.data;
}

/** Deletes a document and its vector collection. */
export async function deleteDocument(documentId) {
  const { data } = await api.delete(`/documents/${documentId}`);
  return data;
}

/** Sends a chat message for a document, returns { answer, sources, riskFlags }. */
export async function sendChatMessage(documentId, message) {
  const { data } = await api.post(`/chat/${documentId}`, { message });
  return data.data;
}

/** Fetches full chat history for a document. */
export async function getChatHistory(documentId) {
  const { data } = await api.get(`/chat/${documentId}/history`);
  return data.data;
}

export default api;
