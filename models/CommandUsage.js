const mongoose = require('mongoose');

const CommandUsageSchema = new mongoose.Schema({
    commandName: { type: String, required: true },
    category: { type: String, required: true },
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
});

// Composite index for faster queries
CommandUsageSchema.index({ commandName: 1, timestamp: -1 });
CommandUsageSchema.index({ category: 1, timestamp: -1 });

module.exports = mongoose.model('CommandUsage', CommandUsageSchema);
