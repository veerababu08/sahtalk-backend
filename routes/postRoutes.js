const express = require("express");
const router = express.Router();
const multer = require("multer");
const Post = require("../models/Post");

/* ===== ADD POST ===== */
/* ===== MULTER STORAGE ===== */

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ===== ADD POST ===== */
router.post("/add", upload.single("media"), async (req, res) => {
  try {

    const { userId, caption, category, visibility } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Media required" });
    }

    const mediaUrl = `https://sahtalk-backend.onrender.com/uploads/${req.file.filename}`;

    const mediaType = req.file.mimetype.startsWith("video")
      ? "video"
      : "image";

    const post = new Post({
      user: userId,
      media: mediaUrl,
      mediaType,
      caption,
      category: category || "Entertainment",
      visibility: visibility || "public",
    });

    await post.save();

    res.json({ success: true, post });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to add post" });
  }
});

/* ===== LIKE / UNLIKE POST ===== */

router.put("/like/:postId/:userId", async (req, res) => {
  try {

    const { postId, userId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({ likes: post.likes.length });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/* ===== DELETE POST ===== */
router.delete("/:postId/:userId", async (req, res) => {
  try {
    const { postId, userId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Only owner can delete
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await post.deleteOne();
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
/* ===== GET POSTS OF A USER (PROFILE) ===== */

router.get("/user/:userId", async (req, res) => {
  try {

    const posts = await Post.find({
      user: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(posts);

  } catch (err) {
    res.status(500).json({ message: "Error fetching user posts" });
  }
});
router.get("/category/:category", async (req, res) => {
  try {

    const posts = await Post.find({
      category: req.params.category,
      visibility: "public"
    }).sort({ createdAt: -1 });

    res.json(posts);

  } catch (err) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});
module.exports = router;
