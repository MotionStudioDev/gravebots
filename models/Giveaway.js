const mongoose = require('mongoose');

const GiveawaySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    prize: { type: String, required: true },
    winnerCount: { type: Number, default: 1 },
    endTime: { type: Date, required: true },
    participants: { type: Array, default: [] },
    ended: { type: Boolean, default: false },
    winners: { type: Array, default: [] }
});

module.exports = mongoose.model('Giveaway', GiveawaySchema);
