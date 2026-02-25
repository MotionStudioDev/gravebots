const mongoose = require('mongoose');

const ReactionRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    emoji: { type: String, required: true },
    roleId: { type: String, required: true }
});

module.exports = mongoose.model('ReactionRole', ReactionRoleSchema);