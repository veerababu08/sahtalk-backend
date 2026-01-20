// routes/messageRoutes.js
const User = require("../models/User");
const fetch = require("node-fetch");

const express = require('express');
const router = express.Router();
// Assuming your message model is correctly defined and imported here:
const Message = require('../models/message'); 

// Middleware to protect routes (assuming you have one, like authMiddleware)
// const { protect } = require('../middleware/authMiddleware'); 

// --- A. Route to Save a New Message (POST) ---
router.post("/messages", async (req, res) => {
  const { chatId, senderId, text } = req.body;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  try {
    const message = await Message.create({
      chatId,
      senderId,
      text,
      expiresAt,
    });

    // 🔍 Get sender details
    const sender = await User.findById(senderId).select(
      "username profileImage"
    );

    // 🔍 Get all users in chat EXCEPT sender
    const receivers = await User.find({
      _id: { $ne: senderId },
      pushToken: { $ne: null },
    });

    // 🔔 SEND PUSH NOTIFICATION
    for (const user of receivers) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: user.pushToken,
          sound: "default",
          title: sender.username, // ✅ SENDER NAME
          body: text, // ✅ MESSAGE TEXT
	image: sender.profileImage

          data: {
            type: "chat",
            chatId,
            senderId,
            senderName: sender.username,
            senderAvatar: sender.profileImage,
          },
        }),
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
});



// --- B. Route to Get ALL Messages for a Chat (GET) ---
router.get('/chats/:chatId/messages', async (req, res) => {
    const { chatId } = req.params;

    try {
        // 🎯 Fetch ALL messages for the chat. Do NOT filter by expiration date here!
        const messages = await Message.find({ chatId: chatId }).sort('createdAt');
        
        res.json(messages);

    } catch (error) {
        console.error('Error fetching chat messages:', error.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

module.exports = router;