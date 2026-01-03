const express = require("express");
const router = express.Router();
const Post = require("../models/Post");

/* ===== ADD POST ===== */
router.post("/add", async (req, res) => {
  try {
    const { user, image, caption } = req.body;

    const post = new Post({
      user,
      image,
      caption,
    });

    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ message: "Failed to add post" });
  }
});

/* ===== GET POSTS BY USER ===== */
router.get("/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts" });
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

module.exports = router;
