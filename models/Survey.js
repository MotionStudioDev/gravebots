const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    question: { type: String, required: true },
    options: [{
        label: { type: String, required: true },
        emoji: { type: String, default: null },
        votes: { type: Array, default: [] } // Array of user IDs
    }],
    endTime: { type: Date, default: null },
    closed: { type: Boolean, default: false },
    creatorId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Survey', SurveySchema);
