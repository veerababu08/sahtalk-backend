const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    roomId: {
      type: String,
      required: true,
      unique: true, // ✅ matches DB index
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Connection ||
  mongoose.model("Connection", ConnectionSchema);
