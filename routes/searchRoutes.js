const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");

/* ================= SEARCH USERS ================= */
// GET /api/search-users?query=abc&userId=123
router.get("/search-users", async (req, res) => {
  try {
    const { query, userId } = req.query;

    if (!query || !userId) {
      return res.json([]);
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: query, $options: "i" },
    })
      .select("_id username profileImage") // return only needed fields
      .limit(20);

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= SAVE PUSH TOKEN ================= */
// POST /api/save-push-token
router.post("/save-push-token", async (req, res) => {
  try {
    const { userId, pushToken } = req.body;

    if (!userId || !pushToken) {
      return res
        .status(400)
        .json({ message: "userId and pushToken are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    await User.findByIdAndUpdate(
      userId,
      { pushToken },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Save push token error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
