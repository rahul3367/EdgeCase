const Document = require("../models/Document");
const Chat = require("../models/Chat");
const pythonService = require("../services/pythonService");

/**
 * POST /api/chat/:documentId
 * Body: { message: string }
 * Sends the user's question + prior history to the RAG microservice,
 * then persists both the user message and the assistant reply.
 */
const sendMessage = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      const err = new Error("Message content is required");
      err.statusCode = 400;
      throw err;
    }

    const document = await Document.findById(documentId);
    if (!document) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }
    if (document.status !== "ready") {
      const err = new Error(
        `Document is not ready for chat yet (status: ${document.status})`
      );
      err.statusCode = 409;
      throw err;
    }

    let chat = await Chat.findOne({ documentId });
    if (!chat) {
      chat = await Chat.create({ documentId, messages: [] });
    }

    // Push the user's message first
    chat.messages.push({ role: "user", content: message });

    // Build lightweight history for the RAG service (last 10 turns)
    const history = chat.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const ragResult = await pythonService.queryDocument(
      documentId,
      message,
      history
    );

    chat.messages.push({
      role: "assistant",
      content: ragResult.answer,
      sources: ragResult.sources || undefined,
    });

    await chat.save();

    res.json({
      success: true,
      data: {
        answer: ragResult.answer,
        sources: ragResult.sources || [],
        riskFlags: ragResult.riskFlags || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chat/:documentId/history
 */
const getChatHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const chat = await Chat.findOne({ documentId });
    res.json({ success: true, data: chat ? chat.messages : [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage, getChatHistory };
