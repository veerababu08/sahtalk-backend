const express = require("express");
const router = express.Router();
const Connection = require("../models/Connection");
const { v4: uuidv4 } = require("uuid");

/* ================= SEND REQUEST ================= */
router.post("/send", async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  const exists = await Connection.findOne({
    $or: [
      { sender: fromUserId, receiver: toUserId },
      { sender: toUserId, receiver: fromUserId },
    ],
  });

  if (exists) {
    return res.status(400).json({ message: "Request already exists" });
  }

  const conn = await Connection.create({
    sender: fromUserId,
    receiver: toUserId,
    roomId: uuidv4(),
    status: "pending",
  });

  res.json(conn);
});

/* ================= PENDING REQUESTS ================= */
router.get("/pending/:userId", async (req, res) => {
  const requests = await Connection.find({
    receiver: req.params.userId,
    status: "pending",
  }).populate("sender", "username email profileImage");

  res.json(requests);
});

/* ================= ACCEPT / REJECT ================= */
router.put("/:id", async (req, res) => {
  const { status } = req.body; // accepted / rejected

  const updated = await Connection.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  res.json(updated);
});

/* ================= CHAT LIST ================= */
router.get("/chatlist/:userId", async (req, res) => {
  const connections = await Connection.find({
    status: "accepted",
    $or: [
      { sender: req.params.userId },
      { receiver: req.params.userId },
    ],
  })
    .populate("sender", "username email profileImage")
    .populate("receiver", "username email profileImage");

  const formatted = connections.map((c) => {
    const other =
      c.sender._id.toString() === req.params.userId
        ? c.receiver
        : c.sender;

    return {
      connectionId: c._id,
      roomId: c.roomId,
      user: other,
    };
  });

  res.json(formatted);
});

module.exports = router;
