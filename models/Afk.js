const mongoose = require('mongoose');

const AfkSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    reason: { type: String, default: 'Sebep belirtilmedi' },
    timestamp: { type: Number, default: Date.now }
});

module.exports = mongoose.model('Afk', AfkSchema);