const mongoose = require('mongoose');

const FloodSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
    commandCount: { type: Number, default: 0 },
    lastMessageTime: { type: Date, default: Date.now },
    lastCommandTime: { type: Date, default: Date.now },
    isMuted: { type: Boolean, default: false },
    muteEndsAt: { type: Date, default: null },
    violations: { type: Number, default: 0 }, // Kaç kez yapıldı
    punished: { type: Boolean, default: false },
    punishmentType: { type: String, enum: ['mute', 'kick', 'ban', 'none'], default: 'none' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Flood', FloodSchema);
