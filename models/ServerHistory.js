const mongoose = require('mongoose');

const ServerHistorySchema = new mongoose.Schema({
    date: { 
        type: String, 
        required: true, 
        unique: true,
        default: () => new Date().toISOString().split('T')[0] // YYYY-MM-DD formatı
    },
    serverCount: { type: Number, required: true, default: 0 },
    userCount: { type: Number, required: true, default: 0 },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServerHistory', ServerHistorySchema);
