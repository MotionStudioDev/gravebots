const mongoose = require('mongoose');

const InfractionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ['warn', 'mute', 'kick', 'ban'], required: true },
    reason: { type: String, default: 'Sebep belirtilmedi.' },
    moderatorId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    active: { type: Boolean, default: true } // Mute veya Ban için hala geçerli mi?
});

module.exports = mongoose.model('Infraction', InfractionSchema);
