const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Optional: store retrieved chunk metadata alongside assistant replies
    // so the UI can show "sources" for an answer.
    sources: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined,
    },
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
