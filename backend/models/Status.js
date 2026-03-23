const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  content: { type: String, required: true },
  caption: { type: String, default: '' },
  backgroundColor: { type: String, default: '#1a1a2e' },
  views: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seenAt: { type: Date, default: Date.now }
  }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now, expires: 86400 } // auto-delete after 24 hours
});

module.exports = mongoose.model('Status', StatusSchema);
