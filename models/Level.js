const mongoose = require('mongoose');

const LevelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    background: { type: String, default: null }, // Varsayılan arka plan yok
    lastMessage: { type: Date, default: Date.now }
});

// Aynı sunucuda aynı kullanıcıdan sadece bir kayıt olabilir
LevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Level', LevelSchema);
