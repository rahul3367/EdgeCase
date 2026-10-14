const express = require("express");
const router = express.Router();
const { sendMessage, getChatHistory } = require("../controllers/chatController");

// POST /api/chat/:documentId   Body: { message: string }
router.post("/:documentId", sendMessage);

// GET /api/chat/:documentId/history
router.get("/:documentId/history", getChatHistory);

module.exports = router;
