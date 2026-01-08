const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const Connection = require("../models/Connection");
const User = require("../models/User");
const { sendPushNotification } = require("../utils/sendPush");

/* ================= SEND CONNECTION REQUEST ================= */
router.post("/send-request", async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;

    if (!fromUserId || !toUserId) {
      return res.status(400).json({
        success: false,
        message: "Missing user IDs",
      });
    }

    const exists = await Connection.findOne({
      $or: [
        { sender: fromUserId, receiver: toUserId },
        { sender: toUserId, receiver: fromUserId },
      ],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Request already exists",
      });
    }

    const connection = await Connection.create({
      sender: fromUserId,
      receiver: toUserId,
      roomId: uuidv4(),
      status: "pending",
    });

    const sender = await User.findById(fromUserId);
    const receiver = await User.findById(toUserId);

    if (receiver?.pushToken && sender) {
await sendPushNotification(
        receiver.pushToken,
        "New Connection Request",
        `${sender.username} sent you a connection request`,
        {
          type: "request",
          senderId: sender._id.toString(),
        }
      );
    }

    res.json({
      success: true,
      message: "Request sent",
      connection,
    });
  } catch (err) {
    console.error("SEND REQUEST ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= GET PENDING REQUESTS ================= */
router.get("/pending/:userId", async (req, res) => {
  try {
    const requests = await Connection.find({
      receiver: req.params.userId,
      status: "pending",
    }).populate("sender", "username email profileImage");

    res.json({ success: true, requests });
  } catch (err) {
    console.error("PENDING REQUESTS ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= ACCEPT REQUEST ================= */
router.post("/accept", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    const connection = await Connection.findOneAndUpdate(
      {
        sender: senderId,
        receiver: receiverId,
        status: "pending",
      },
      { status: "accepted" },
      { new: true }
    );

    if (!connection) {
      return res.status(400).json({
        success: false,
        message: "Request not found",
      });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (sender?.pushToken && receiver) {
await sendPushNotification(
        sender.pushToken,
        "Request Accepted 🎉",
        `${receiver.username} accepted your request`,
        {
          type: "accepted",
          roomId: connection.roomId,
        }
      );
    }

    res.json({
      success: true,
      connection,
    });
  } catch (err) {
    console.error("ACCEPT REQUEST ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= REJECT REQUEST ================= */
router.post("/reject", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    await Connection.findOneAndDelete({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    res.json({
      success: true,
      message: "Request rejected",
    });
  } catch (err) {
    console.error("REJECT REQUEST ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= CHAT LIST ================= */
router.get("/chats/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const connections = await Connection.find({
      status: "accepted",
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "username email profileImage")
      .populate("receiver", "username email profileImage");

    const chats = connections.map((conn) => {
      const otherUser =
        conn.sender._id.toString() === userId
          ? conn.receiver
          : conn.sender;

      return {
        connectionId: conn._id,
        roomId: conn.roomId,
        user: otherUser,
      };
    });

    res.json({ success: true, chats });
  } catch (err) {
    console.error("CHAT LIST ERROR:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
