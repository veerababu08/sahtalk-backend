const express = require("express");
const multer = require("multer");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("file"), (req, res) => {
  const mime = req.file.mimetype;

  let type = "document";
  if (mime.startsWith("image")) type = "image";
  else if (mime.startsWith("video")) type = "video";
  else if (mime.startsWith("audio")) type = "audio";

  res.json({
    url: `/uploads/${req.file.filename}`,
    type,
    name: req.file.originalname,
  });
});

module.exports = router;
