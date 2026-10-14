const path = require("path");
const Document = require("../models/Document");
const pythonService = require("../services/pythonService");

/**
 * POST /api/upload
 * Accepts a single PDF (field name "file"), creates a Document record,
 * then forwards the file to the Python microservice for RAG processing.
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error("No file uploaded. Field name must be 'file'.");
      err.statusCode = 400;
      throw err;
    }

    // 1. Create the Document record immediately so the frontend can poll status
    const document = await Document.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "processing",
    });

    // 2. Forward to Python microservice (extraction + chunking + embeddings)
    try {
      const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
      const result = await pythonService.processDocument(
        filePath,
        document._id.toString()
      );

      document.chunksCount = result.chunksCount || 0;
      document.vectorDbCollectionId = result.collectionId || document._id.toString();
      document.riskSummary = result.riskSummary || null;
      document.status = "ready";
      await document.save();
    } catch (processingErr) {
      document.status = "failed";
      document.errorMessage = processingErr.message;
      await document.save();
      console.error("[Upload] Python processing failed:", processingErr.message);
      // Don't throw — the document record still exists, just marked failed.
      // The frontend can show "processing failed, try re-uploading".
    }

    res.status(201).json({ success: true, data: document });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadDocument };
