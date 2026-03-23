const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  bio: { type: String, default: "Hey there! I am using WhatsApp." },
  profilePicture: { type: String, default: "" },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archived: [{ type: String }],
  pinned: [{ type: String }],
  chatBackgrounds: { type: Map, of: String, default: {} },
  settings: {
    theme: { type: String, default: 'dark' },
    textSize: { type: Number, default: 16 },
    disappearTime: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
