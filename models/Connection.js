const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema({
  users: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],
  status: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Connection", ConnectionSchema);
