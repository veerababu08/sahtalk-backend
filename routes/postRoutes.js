const express = require("express");
const router = express.Router();
const Post = require("../models/Post");

/* ================= ADD POST (CLOUDINARY URL) ================= */

router.post("/add", async (req, res) => {
  try {

    const {
       user,
       caption,
       media,
       mediaType,
       category,
       visibility,
      } = req.body;

    if (!media) {
      return res.status(400).json({ message: "Media URL required" });
    }

    const post = new Post({
      user,
      media,
      mediaType,
      caption: caption || "",
      category: category || "Entertainment",
      visibility: visibility || "public",
    });

    await post.save();

    res.json({ success: true, post });

  } catch (err) {
    console.log("ADD POST ERROR:", err);
    res.status(500).json({message: err.message });
  }
});

/* ================= LIKE / UNLIKE ================= */

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

/* ================= DELETE ================= */

router.delete("/:postId/:userId", async (req, res) => {
  try {

    const { postId, userId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await post.deleteOne();

    res.json({ message: "Post deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= USER POSTS ================= */

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

/* ================= CATEGORY (WITH PAGINATION) ================= */

router.get("/category/:category", async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const posts = await Post.find({
      category: req.params.category,
      visibility: "public"
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username profileImage");

    res.json(posts);

  } catch (err) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

module.exports = router;