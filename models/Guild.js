const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: 'g!' },
    language: { type: String, default: 'tr' },
    saas: { type: Boolean, default: false },
    welcomeChannel: { type: String, default: null },
    welcomeStatus: { type: Boolean, default: false },
    welcomeMessage: { type: String, default: 'Hoşgeldin {user}, sunucumuza katıldı!' },
    leaveChannel: { type: String, default: null },
    leaveStatus: { type: Boolean, default: false },
    leaveMessage: { type: String, default: null },
    ticketCategory: { type: String, default: null },
    ticketLogChannel: { type: String, default: null },
    ticketMessage: { type: String, default: 'Bir sorun yaşıyorsanız veya yardıma ihtiyacınız varsa aşağıdaki butona tıklayarak bir destek talebi açabilirsiniz.' },
    autorole: { type: String, default: null },
    autoroleStatus: { type: Boolean, default: false },
    inviteSystem: {
        status: { type: Boolean, default: false },
        channel: { type: String, default: null }
    },
    disabledCommands: { type: Array, default: [] },
    adminRoles: { type: Array, default: [] },
    protections: {
        antiSwear: { type: Boolean, default: false },
        antiLink: { type: Boolean, default: false },
        antiSpam: { type: Boolean, default: false },
        antiCaps: { type: Boolean, default: false },
        antiBot: { type: Boolean, default: false },
        antiUrl: { type: Boolean, default: false }, // Sunucu URL/Link koruması
        antiEmoji: { type: Boolean, default: false }, // Emoji koruması
        bannedTags: { type: Array, default: [] },
        ageLimit: { type: Number, default: 0 } // 0 = Kapalı, Gün bazında (örn: 7)
    },
    logs: {
        moderation: { type: String, default: null },
        messages: { type: String, default: null }
    },
    levelSystem: {
        status: { type: Boolean, default: false },
        channel: { type: String, default: null }, // Level up mesajının gideceği kanal (null = o anki kanal)
        xpRate: { type: Number, default: 1 } // XP çarpanı
    },
    economy: {
        status: { type: Boolean, default: false },
        dailyMin: { type: Number, default: 500 },
        dailyMax: { type: Number, default: 1000 },
        currency: { type: String, default: '💸' }
    },
    shop: [{
        name: { type: String, required: true },
        price: { type: Number, required: true },
        description: { type: String, default: '' },
        roleId: { type: String, default: null } // Satın alınca verilecek rol (opsiyonel)
    }]
});

module.exports = mongoose.model('Guild', GuildSchema);