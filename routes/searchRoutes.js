const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");

// GET /api/search-users
// routes/searchUsers.js (or similar)

router.get("/search-users", async (req, res) => {
  try {
    const { query, userId } = req.query;

    if (!query) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: query, $options: "i" },
    }).select("_id username"); // 👈 VERY IMPORTANT

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;
