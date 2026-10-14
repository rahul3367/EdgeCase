const Document = require("../models/Document");
const pythonService = require("../services/pythonService");

/**
 * GET /api/documents
 * Returns all uploaded documents, most recent first.
 */
const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find().sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id
 * Returns a single document by id, including its cached risk summary.
 */
const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }
    res.json({ success: true, data: document });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/documents/:id
 * Deletes the Mongo record and asks the Python service to drop the
 * corresponding ChromaDB collection.
 */
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }

    try {
      await pythonService.deleteCollection(document._id.toString());
    } catch (e) {
      console.warn("[Document] Failed to delete vector collection:", e.message);
    }

    await document.deleteOne();
    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDocuments, getDocumentById, deleteDocument };
