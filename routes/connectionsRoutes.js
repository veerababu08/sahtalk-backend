const express = require('express');
const router = express.Router();
const { Connection } = require('../models/Connection');
const User = require('../models/User');

// ------------------------------
// 1️⃣ SEND FOLLOW REQUEST
// ------------------------------
// SEND FOLLOW / CONNECTION REQUEST
router.post('/request', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Missing IDs" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot connect to yourself" });
    }

    const exists = await Connection.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (exists) {
      return res.status(400).json({ message: "Already connected or pending" });
    }

    const roomId = `${senderId}_${receiverId}`;

    const connection = new Connection({
      sender: senderId,
      receiver: receiverId,
      roomId,
      status: "pending"
    });

    await connection.save();

    res.json({ message: "Request sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// ------------------------------
// 2️⃣ ACCEPT REQUEST
// ------------------------------
router.post("/accept", async (req, res) => {
  const { requestId } = req.body;

  const connection = await Connection.findById(requestId);
  if (!connection) return res.status(404).json({ msg: "Not found" });

  connection.status = "accepted";
  await connection.save();

  res.json({ success: true });
});


// ------------------------------
// 3️⃣ GET ALL ACCEPTED FRIENDS (CHAT LIST)
// ------------------------------
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const connections = await Connection.find({
            status: "accepted",
            $or: [{ sender: userId }, { receiver: userId }]
        }).populate('sender receiver');

        const formatted = connections.map(conn => ({
            roomId: conn.roomId,
            otherUserId:
                conn.sender._id.toString() === userId
                    ? conn.receiver._id
                    : conn.sender._id,
            otherUsername:
                conn.sender._id.toString() === userId
                    ? conn.receiver.username
                    : conn.sender.username,
            lastMessage: "Tap to chat"
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ------------------------------
// ------------------------------
// 2️⃣ GET PENDING REQUESTS
// ------------------------------
// GET PENDING REQUESTS
router.get("/pending/:userId", async (req, res) => {
  try {
    const requests = await Connection.find({
      receiver: req.params.userId,
      status: "pending",
    }).populate("sender", "username email");

    res.json(requests);
  } catch (err) {
    res.status(500).json([]);
  }
});
module.exports = router;
