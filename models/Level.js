const mongoose = require('mongoose');

const LevelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    barColor: { type: String, default: 'pink-purple' }, // Renk şeması
    customBarColor: { type: String, default: '#8b5cf6' } // Özel renk hex kodu
});

// Aynı sunucuda aynı kullanıcıdan sadece bir kayıt olabilir
LevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Level', LevelSchema);
