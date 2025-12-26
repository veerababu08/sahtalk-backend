const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");

// GET /api/search-users
router.get("/search-users", async (req, res) => {
  const { query, userId } = req.query;

  if (!query) {
    return res.json([]);
  }

  try {
    const findQuery = {
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    };

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      findQuery._id = { $ne: userId };
    }

    const users = await User.find(findQuery).select(
      "username email profileImage"
    );

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
