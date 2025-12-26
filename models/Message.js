const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      default: "",
    },

    mediaUrl: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "document"],
      default: "text",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
