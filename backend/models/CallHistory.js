const mongoose = require('mongoose');

const CallHistorySchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['voice', 'video'], default: 'voice' },
  status: { type: String, enum: ['missed', 'answered', 'rejected'], default: 'missed' },
  duration: { type: Number, default: 0 }, // in seconds
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('CallHistory', CallHistorySchema);
