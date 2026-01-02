const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Connection", ConnectionSchema);
