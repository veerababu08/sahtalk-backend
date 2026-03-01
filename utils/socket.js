// utils/socket.js
const Message = require("../models/Message");
const User = require("../models/User");
const Connection = require("../models/Connection");
const { sendPushNotification } = require("./sendPush");

// 🔥 Store online users
const onlineUsers = new Map();

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // ✅ Register user after login
    socket.on("registerUser", (userId) => {
      onlineUsers.set(userId.toString(), socket.id);
      console.log("✅ User registered:", userId);
    });

    // OPTIONAL (if you still want rooms)
    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
      console.log(`📥 Joined room ${roomId}`);
    });

    // ✅ SEND MESSAGE
    socket.on("sendMessage", async (data) => {
      try {
        // Save message
        const msg = await Message.create(data);

        // Find connection
        const connection = await Connection.findOne({
          roomId: data.roomId,
        });

        if (!connection) return;

        // Find receiver
        const receiverId =
          connection.sender.toString() === data.sender
            ? connection.receiver
            : connection.sender;

        // 🔥 Check if receiver is online
        const receiverSocketId = onlineUsers.get(
          receiverId.toString()
        );

        if (receiverSocketId) {
          // ✅ Send real-time message
          io.to(receiverSocketId).emit("receiveMessage", msg);
          console.log("📩 Message sent via socket");
        } else {
          console.log("📴 Receiver offline");
        }

        // 🔔 PUSH NOTIFICATION (only if offline)
        if (!receiverSocketId) {
          const receiver = await User.findById(receiverId);

          if (receiver?.pushToken) {
            console.log("🚀 Sending push to:", receiver.pushToken);

            await sendPushNotification(
              receiver.pushToken,
              "💬 New Message",
              data.text || "You received a message",
              {
                type: "chat",
                roomId: data.roomId,
                senderId: data.sender,
              }
            );
          }
        }
      } catch (err) {
        console.log("❌ Socket sendMessage error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

      // Remove user from onlineUsers
      for (let [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
};