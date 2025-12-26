const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the model we just created

// 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: "User Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password (In a real app, use bcrypt to compare hashes)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Success
    res.json({ 
      message: "Login Success", 
      user: { 
        id: user._id,
        name: user.username, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// EXPORT THE ROUTER
module.exports = router;