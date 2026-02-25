const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: 'g!' },
    language: { type: String, default: 'tr' },
    welcomeChannel: { type: String, default: null },
    welcomeMessage: { type: String, default: 'Hoşgeldin {user}, sunucumuza katıldı!' },
    leaveChannel: { type: String, default: null },
    leaveMessage: { type: String, default: null },
    ticketCategory: { type: String, default: null },
    ticketLogChannel: { type: String, default: null },
    ticketMessage: { type: String, default: 'Bir sorun yaşıyorsanız veya yardıma ihtiyacınız varsa aşağıdaki butona tıklayarak bir destek talebi açabilirsiniz.' },
    autorole: { type: String, default: null },
    disabledCommands: { type: Array, default: [] },
    adminRoles: { type: Array, default: [] },
    protections: {
        antiSwear: { type: Boolean, default: false },
        antiLink: { type: Boolean, default: false },
        antiSpam: { type: Boolean, default: false },
        antiCaps: { type: Boolean, default: false },
        antiBot: { type: Boolean, default: false },
        bannedTags: { type: Array, default: [] },
        ageLimit: { type: Number, default: 0 } // 0 = Kapalı, Gün bazında (örn: 7)
    },
    logs: {
        moderation: { type: String, default: null },
        messages: { type: String, default: null }
    }
});

module.exports = mongoose.model('Guild', GuildSchema);