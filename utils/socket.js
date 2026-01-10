// utils/socket.js
const Message = require("../models/Message");
const User = require("../models/User");
const Connection = require("../models/Connection");
const { sendPushNotification } = require("./sendPush");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // JOIN ROOM
    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
      console.log(`📥 Joined room ${roomId}`);
    });

    // SEND MESSAGE
    socket.on("sendMessage", async (data) => {
      try {
        // Save message
        const msg = await Message.create(data);

        // Emit message to room
        io.to(data.roomId).emit("receiveMessage", msg);

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

        // Don't notify sender
        if (receiverId.toString() === data.sender) return;

        // Get receiver
        const receiver = await User.findById(receiverId);

        // Send push
        if (receiver?.pushToken) {
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
      } catch (err) {
        console.log("❌ Socket sendMessage error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
};
