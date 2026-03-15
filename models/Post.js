const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  media: {
    type: String,
    required: true,
  },

  mediaType: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },

  caption: {
    type: String,
    default: "",
  },

  /* ===== CATEGORY FOR EXPLORE ===== */

  category: {
    type: String,
    enum: ["Travel", "Food", "Education", "Entertainment"],
    default: "Entertainment",
  },

  /* ===== VISIBILITY ===== */

  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
},
{ timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);