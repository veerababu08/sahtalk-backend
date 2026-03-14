const Message = require("../models/Message");
const User = require("../models/User");
const Connection = require("../models/Connection");
const { sendPushNotification } = require("./sendPush");

const onlineUsers = new Map();

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("registerUser", (userId) => {
      onlineUsers.set(userId.toString(), socket.id);
      console.log("✅ User registered:", userId);
    });

    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
    });

    // ✅ SEND MESSAGE (Fixed Arguments)
    socket.on("sendMessage", async (data) => {
      try {
        const msg = await Message.create(data);
        const connection = await Connection.findOne({ roomId: data.roomId });
        if (!connection) return;

        const receiverId = connection.sender.toString() === data.sender 
          ? connection.receiver 
          : connection.sender;

        const receiverSocketId = onlineUsers.get(receiverId.toString());

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", msg);
        }

        // 🔔 PUSH NOTIFICATION (Offline Logic)
        if (!receiverSocketId) {
          const receiver = await User.findById(receiverId);
          const sender = await User.findById(data.sender);

          if (receiver?.pushToken) {
           // NEW CODE (Copy this)
await sendPushNotification(
  receiver.pushToken,
  sender?.username || "Someone",         // TITLE: Shows the sender's name
  data.text || "💬 Sent an attachment",  // BODY: Shows the actual message text
  {
    type: "chat",
    roomId: data.roomId,
    senderId: data.sender,
    senderName: sender?.username,        // Added for frontend navigation
    icon: sender?.profileImage || "https://your-default-logo.png"
  }
);
          }
        }
      } catch (err) {
        console.log("❌ Socket sendMessage error:", err);
      }
    });

    // 📞 CALL USER (New Logic for Call Notifications)
   socket.on("call-user", async (data) => {
  const { toUserId, roomId, callerId, type } = data;

  const receiverSocketId = onlineUsers.get(toUserId.toString());

  const caller = await User.findById(callerId);
  const receiver = await User.findById(toUserId);

  // ✅ SEND SOCKET EVENT (if online)
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("incoming-call", {
      roomId,
      callerId,
      callerName: caller?.username,
      type,
    });	
  }

  // 🔔 ALWAYS SEND PUSH (important)
  if (receiver?.pushToken) {
    await sendPushNotification(
      receiver.pushToken,
      `${caller?.username || "Someone"} is calling`,
      `📞 Incoming ${type} call`,
      {
        type: "incoming-call",
        roomId,
        senderId: callerId,
        senderName: caller?.username,
        callType: type,
        icon: caller?.profileImage,
      }
    );
  }
});

    socket.on("disconnect", () => {
      for (let [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
};