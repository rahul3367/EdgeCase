require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { clientOrigin, port } = require("./config/config");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const uploadRoutes = require("./routes/uploadRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

// ---- Core middleware ----
app.use(cors({ origin: clientOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ---- Serve uploaded PDFs so the frontend's react-pdf viewer can load them ----
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---- Health check ----
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

// ---- Routes ----
app.use("/api/upload", uploadRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

// ---- 404 + error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

// ---- Start server ----
const start = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`[Server] Listening on http://localhost:${port}`);
  });
};

start();

module.exports = app;
