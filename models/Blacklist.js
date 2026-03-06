const mongoose = require('mongoose');

const BlacklistSchema = new mongoose.Schema({
    type: { type: String, enum: ['user', 'guild'], required: true },
    targetId: { type: String, required: true, unique: true },
    reason: { type: String, default: 'Belirtilmedi' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Blacklist', BlacklistSchema);
