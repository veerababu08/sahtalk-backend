const express = require("express");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const User = require("../models/User");

const router = express.Router();

/* ================= SIGNUP ================= */
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username: username.trim(),
      email: cleanEmail,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Wrong password" });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
	profileImage: user.profileImage || "",
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= SEND OTP ================= */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: "Sahtalks",
        },
        to: [{ email: cleanEmail }],
        subject: "Sahtalks OTP Verification",
        textContent: `Your OTP is ${otp}. It is valid for 10 minutes.`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= VERIFY OTP ================= */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email & OTP required" });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      otp,
      otpExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      otp,
      otpExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
