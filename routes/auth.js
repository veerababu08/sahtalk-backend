const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// ---- SIGNUP ----
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    res.json({ msg: "User created", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- LOGIN ----
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    // Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ msg: "Wrong password" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ msg: "Login successful", token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
