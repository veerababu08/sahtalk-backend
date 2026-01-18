// routes/messageRoutes.js
const User = require('../models/User');
const sendPush = require('../utils/sendPush');

const express = require('express');
const router = express.Router();
// Assuming your message model is correctly defined and imported here:
const Message = require('../models/Message'); 

// Middleware to protect routes (assuming you have one, like authMiddleware)
// const { protect } = require('../middleware/authMiddleware'); 

// --- A. Route to Save a New Message (POST) ---
router.post('/messages', async (req, res) => {
    // You'll need to send chatId and senderId from the frontend
    const { chatId, senderId, receiverId, text } = req.body;

    
    // 🎯 The Key Logic for 48-Hour Expiry
    // Calculate the expiration time (48 hours from now)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); 
try {
  const newMessage = await Message.create({
    chatId,
    senderId,
    text,
    expiresAt,
  });

  // 🔔 SEND PUSH NOTIFICATION TO RECEIVER (AFTER SAVE)
  try {
    const receiver = await User.findById(receiverId);

    if (receiver && receiver.pushToken) {
      await sendPush(
        receiver.pushToken,
        "New Message 💬",
        text,
        {
          type: "message",
          chatId,
          senderId,
        }
      );
    }
  } catch (pushErr) {
    console.log("Push notification failed:", pushErr.message);
  }

  res.status(201).json(newMessage);
} catch (error) {
  console.error("Error saving message:", error.message);
  res.status(500).json({ error: "Failed to save message" });
}


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