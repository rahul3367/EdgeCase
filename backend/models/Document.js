const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    uploadedBy: {
      // No auth system yet — defaults to "anonymous". Swap for a real user
      // ref (ObjectId -> User) once auth is added.
      type: String,
      default: "anonymous",
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    chunksCount: {
      type: Number,
      default: 0,
    },
    vectorDbCollectionId: {
      // The ChromaDB collection name/id that stores this document's vectors.
      // Set once the Python service finishes processing.
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed"],
      default: "uploaded",
    },
    riskSummary: {
      // Cached top-level risk analysis so the frontend doesn't have to
      // re-run RAG every time the document is opened.
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
