const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    type: { type: String, required: true }, // 'messageDelete', 'messageUpdate', 'memberJoin', etc.
    userId: { type: String, required: true },
    userTag: { type: String, required: true },
    content: { type: String, default: '' }, // Silinen mesaj içeriği
    oldContent: { type: String, default: '' }, // Düzenlenen mesaj eski içeriği
    newContent: { type: String, default: '' }, // Düzenlenen mesaj yeni içeriği
    timestamp: { type: Date, default: Date.now },
    channelId: { type: String },
    channelName: { type: String }
});

module.exports = mongoose.model('Log', LogSchema);
