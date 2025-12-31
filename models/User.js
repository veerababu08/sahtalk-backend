const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true }, // ✅ ONLY username
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: { type: String, default: "" },
  },
  { timestamps: true }
);


module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);
