const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, default: "" },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  deleted: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  type: { type: String, default: 'text' },
  imageUrl: { type: String, default: "" },
  viewOnce: { type: Boolean, default: false },
  viewed: { type: Boolean, default: false },
  isForwarded: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [{ emoji: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  fileName: { type: String, default: "" },
  fileSize: { type: String, default: "" },
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
