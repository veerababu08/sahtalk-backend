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
// MODELS (Moved up for use in routes)
// =========================
const User = require("./models/User");
const Message = require("./models/Message");
const Connection = require("./models/Connection");

// =========================
// ROUTES
// =========================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/connections", require("./routes/connectionsRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/upload", require("./routes/upload"));

// =========================
// NEW: SEARCH USERS (Fixed for search query)
// =========================
app.get("/api/search-users", async (req, res) => {
  const { query, userId } = req.query;
  try {
    const users = await User.find({
      _id: { $ne: userId }, // Don't show the current user
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("name email profileImage");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
});

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
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error", err));


// =========================
// MULTER CONFIG
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// =========================
// CONNECTION REQUEST (Fixed Variable Names)
// =========================
app.post("/api/send-request", async (req, res) => {
  // Destructure names used in AuthContext (fromUserId, toUserId)
  const { fromUserId, toUserId } = req.body; 

  const exists = await Connection.findOne({
    $or: [
      { sender: fromUserId, receiver: toUserId },
      { sender: toUserId, receiver: fromUserId },
    ],
  });

  if (exists)
    return res.status(400).json({ message: "Already connected or request pending" });

  const conn = await Connection.create({
    sender: fromUserId,
    receiver: toUserId,
    roomId: uuidv4(),
    status: "pending"
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
  }).populate("sender", "name email profileImage"); // Changed username to name

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
    .populate("sender", "name email profileImage")
    .populate("receiver", "name email profileImage");

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
    .sort({ createdAt: 1 });
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
      type, 
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