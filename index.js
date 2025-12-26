// =========================
// ENV + CORE
// =========================
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// =========================
// APP INIT
// =========================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// =========================
// MIDDLEWARE
// =========================
app.use(express.json());
app.use(cors({ origin: "*" }));

// =========================
// UPLOADS FOLDER
// =========================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static(uploadsDir));

// =========================
// DATABASE
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error", err));

// =========================
// MODELS
// =========================
const User = require("./models/User");
const Message = require("./models/Message");

const Connection = mongoose.model(
  "Connection",
  new mongoose.Schema(
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      roomId: String,
      status: {
        type: String,
        enum: ["pending", "accepted"],
        default: "pending",
      },
    },
    { timestamps: true }
  )
);

// =========================
// FILE UPLOAD (MULTER)
// =========================
// =========================
// FILE UPLOAD (ANY FILE)
// =========================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });


// =========================
// AUTH
// =========================
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok)
    return res.status(401).json({ success: false, message: "Invalid password" });

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
});

// =========================
// CONNECTION REQUEST
// =========================
app.post("/api/follow-request", async (req, res) => {
  const { senderId, receiverId } = req.body;

  const exists = await Connection.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  });

  if (exists)
    return res.status(400).json({ message: "Already connected" });

  const conn = await Connection.create({
    sender: senderId,
    receiver: receiverId,
    roomId: uuidv4(),
  });

  res.json(conn);
});

// =========================
// PENDING REQUESTS
// =========================
app.get("/api/pending-requests/:userId", async (req, res) => {
  const requests = await Connection.find({
    receiver: req.params.userId,
    status: "pending",
  }).populate("sender", "username email profileImage");

  res.json(requests);
});

// =========================
// ACCEPT REQUEST
// =========================
app.put("/api/connections/:id", async (req, res) => {
  const updated = await Connection.findByIdAndUpdate(
    req.params.id,
    { status: "accepted" },
    { new: true }
  );
  res.json(updated);
});

// =========================
// CHAT CONNECTIONS
// =========================
app.get("/api/connections/:userId", async (req, res) => {
  const connections = await Connection.find({
    status: "accepted",
    $or: [
      { sender: req.params.userId },
      { receiver: req.params.userId },
    ],
  })
    .populate("sender", "username email profileImage")
    .populate("receiver", "username email profileImage");

  const formatted = connections.map((conn) => {
    const isSender = conn.sender._id.toString() === req.params.userId;
    return {
      _id: conn._id,
      roomId: conn.roomId,
      otherUser: isSender ? conn.receiver : conn.sender,
    };
  });

  res.json(formatted);
});
app.get("/api/messages/:roomId", async (req, res) => {
  const msgs = await Message.find({ roomId: req.params.roomId })
    .sort({ createdAt: 1 }); // oldest → newest

  res.json(msgs);
});


// =========================
// FILE UPLOAD MESSAGE
// =========================
app.post("/api/upload", upload.single("file"), (req, res) => {
  const mime = req.file.mimetype;

  let type = "document";
  if (mime.startsWith("image")) type = "image";
  else if (mime.startsWith("video")) type = "video";
  else if (mime.startsWith("audio")) type = "audio";

  res.json({
    url: `/uploads/${req.file.filename}`,
    type,
    name: req.file.originalname,
  });
});

// =========================
// SOCKET.IO
// =========================
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on("sendMessage", async (data) => {
    const msg = await Message.create(data);
    io.to(data.roomId).emit("receiveMessage", msg);
  });
socket.on("call-user", ({ to, offer, type }) => {
  io.to(to).emit("incoming-call", {
    from: socket.id,
    offer,
    type, // "voice" | "video"
  });
});

socket.on("answer-call", ({ to, answer }) => {
  io.to(to).emit("call-accepted", {
    from: socket.id,
    answer,
  });
});

socket.on("ice-candidate", ({ to, candidate }) => {
  io.to(to).emit("ice-candidate", candidate);
});

socket.on("end-call", ({ to }) => {
  io.to(to).emit("call-ended");
});


  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
