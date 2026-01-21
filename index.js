// =========================
// ENV + CORE
// =========================
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { sendPushNotification } = require("./utils/sendPush");


// =========================
// APP INIT
// =========================
const app = express();
const server = http.createServer(app);
const activeUsersInRoom = new Map(); // userId -> roomId (for messages)
const socketUserMap = new Map();     // socket.id -> userId
const onlineUsers = new Map();       // userId -> socket.id (for calls)


const io = new Server(server, {
  cors: { origin: "*" },
});

// =========================
// MIDDLEWARE
// =========================
app.use(express.json());
app.use(cors({ origin: "*" }));

// =========================
// MODELS
// =========================
const User = require("./models/User");
const Message = require("./models/Message");
const Connection = require("./models/Connection");

// =========================
// AUTH / OTHER ROUTES
// =========================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/connections", require("./routes/connectionsRoutes"));



// =========================
// UPLOADS FOLDER
// =========================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// =========================
// MULTER CONFIG (20MB LIMIT)
// =========================
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// =========================
// DATABASE
// =========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// =========================
// SEARCH USERS
// =========================
app.get("/api/search-users", async (req, res) => {
  const { query, userId } = req.query;
  if (!query) return res.json([]);

  try {
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("username email profileImage");

    res.json(users);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
});

// =========================
// SEND CONNECTION REQUEST
// =========================
app.post("/api/send-request", async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  const exists = await Connection.findOne({
    $or: [
      { sender: fromUserId, receiver: toUserId },
      { sender: toUserId, receiver: fromUserId },
    ],
  });

  if (exists)
    return res
      .status(400)
      .json({ message: "Already connected or request pending" });

  const conn = await Connection.create({
    sender: fromUserId,
    receiver: toUserId,
    roomId: uuidv4(),
    status: "pending",
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
// ACCEPT REQUEST (SECURE)
// =========================
app.put("/api/connections/:id/accept", async (req, res) => {
  const { userId } = req.body;

  const updated = await Connection.findOneAndUpdate(
    { _id: req.params.id, receiver: userId },
    { status: "accepted" },
    { new: true }
  );

  if (!updated)
    return res.status(403).json({ message: "Not authorized" });

  res.json(updated);
});

// =========================
// CHAT LIST / HOME
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

// =========================
// GET MESSAGES BY ROOM
// =========================
app.get("/api/messages/:roomId", async (req, res) => {
  const msgs = await Message.find({ roomId: req.params.roomId }).sort({
    createdAt: 1,
  });
  res.json(msgs);
});

// =========================
// FILE UPLOAD (IMAGE / VIDEO / AUDIO / PDF / DOCS)
// =========================
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No file uploaded" });

  const mime = req.file.mimetype;
  let type = "document";

  if (mime.startsWith("image/")) type = "image";
  else if (mime.startsWith("video/")) type = "video";
  else if (mime.startsWith("audio/")) type = "audio";
  else if (mime === "application/pdf") type = "pdf";
  else if (
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ].includes(mime)
  ) {
    type = "document";
  } else {
    return res.status(400).json({ message: "Unsupported file type" });
  }

  res.json({
    url: `/uploads/${req.file.filename}`,
    type,
    name: req.file.originalname,
    size: req.file.size,
  });
});


// =========================
// SOCKET.IO
// =========================
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // ✅ JOIN ROOM
socket.on("joinRoom", ({ roomId, userId }) => {
  socket.join(roomId);

  socketUserMap.set(socket.id, userId.toString());
  activeUsersInRoom.set(userId.toString(), roomId);
  socket.to(roomId).emit("user-joined", {
    socketId: socket.id,
  });
});
// =========================
// 📞 CALL SIGNALING (VOICE + VIDEO)
// =========================

// Register user for calls
socket.on("register-call", ({ userId }) => {
  onlineUsers.set(userId.toString(), socket.id);
});

// CALL USER
socket.on("call-user", ({ toUserId, roomId, callerId, type }) => {
  const receiverSocket = onlineUsers.get(toUserId.toString());

  if (receiverSocket) {
    io.to(receiverSocket).emit("incoming-call", {
      roomId,
      callerId,
      type, // "audio" | "video"
    });
  }
});

// ACCEPT CALL
socket.on("accept-call", ({ roomId, callerId }) => {
  socket.join(roomId);

  const callerSocket = onlineUsers.get(callerId.toString());
  if (callerSocket) {
    io.to(callerSocket).emit("call-accepted", { roomId });
  }
});


// END CALL
socket.on("end-call", ({ roomId }) => {
  io.to(roomId).emit("end-call");
});

// =========================
// 🔁 WEBRTC SIGNALING
// =========================
socket.on("offer", ({ roomId, offer }) => {
  socket.to(roomId).emit("offer", offer);
});

socket.on("answer", ({ roomId, answer }) => {
  socket.to(roomId).emit("answer", answer);
});

socket.on("ice-candidate", ({ roomId, candidate }) => {
  socket.to(roomId).emit("ice-candidate", candidate);
});


  // ✅ SEND MESSAGE
socket.on("sendMessage", async (data) => {
  try {
    const connection = await Connection.findOne({ roomId: data.roomId });
    if (!connection) return;

    const senderId = data.sender.toString();
    const receiverId =
      connection.sender.toString() === senderId
        ? connection.receiver.toString()
        : connection.sender.toString();

    const msg = await Message.create({
      roomId: data.roomId,
      sender: senderId,
      receiver: receiverId,
      content: data.text || "",
      messageType: data.type || "text",
      mediaUrl: data.mediaUrl || "",
      fileMeta: data.fileMeta || null,
      clientTempId: data.clientTempId,
    });

    // Send to room
    io.to(data.roomId).emit("receiveMessage", msg);

    // Send direct only if receiver not in room
    const receiverSocketId = onlineUsers.get(receiverId);
    const receiverActiveRoom = activeUsersInRoom.get(receiverId);

    if (receiverSocketId && receiverActiveRoom !== data.roomId) {
      io.to(receiverSocketId).emit("receiveMessage", msg);
    }

  } catch (err) {
    console.error("❌ sendMessage error:", err);
  }
});




   







 socket.on("leaveRoom", ({ roomId, userId }) => {
  socket.leave(roomId);

  if (userId) {
    activeUsersInRoom.delete(userId.toString());
  }
});






 

  // ✅ DISCONNECT
socket.on("disconnect", () => {
  const userId = socketUserMap.get(socket.id);

  if (userId) {
    socketUserMap.delete(socket.id);

    // Remove only if this socket is the active one
    if (onlineUsers.get(userId.toString()) === socket.id) {
      onlineUsers.delete(userId.toString());
    }

    activeUsersInRoom.delete(userId.toString());
  }

  console.log("🔴 Socket disconnected:", socket.id);
});

});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
