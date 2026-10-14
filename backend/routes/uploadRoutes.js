const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const { uploadDocument } = require("../controllers/uploadController");

// POST /api/upload  (multipart/form-data, field name: "file")
router.post("/", upload.single("file"), uploadDocument);

module.exports = router;
