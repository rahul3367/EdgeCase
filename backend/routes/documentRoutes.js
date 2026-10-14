const express = require("express");
const router = express.Router();
const {
  getDocuments,
  getDocumentById,
  deleteDocument,
} = require("../controllers/documentController");

// GET /api/documents
router.get("/", getDocuments);

// GET /api/documents/:id
router.get("/:id", getDocumentById);

// DELETE /api/documents/:id
router.delete("/:id", deleteDocument);

module.exports = router;
