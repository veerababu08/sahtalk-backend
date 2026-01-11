const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // ✅ ROOM (ADDED – REQUIRED FOR CHAT HISTORY)
    roomId: {
      type: String,
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // For text messages
    content: {
      type: String,
      trim: true,
      default: "",
    },

    // Message type
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "pdf", "document"],
      default: "text",
    },

    // Media / file URL
    mediaUrl: {
      type: String,
      default: "",
    },

    // File metadata
    fileMeta: {
      name: { type: String },
      size: { type: Number },
      mimeType: { type: String },
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
