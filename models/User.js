const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    money: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    inventory: { type: Array, default: [] },
    badges: { type: Array, default: [] },
    invites: { type: Number, default: 0 },
    invitedBy: { type: String, default: null }
});

module.exports = mongoose.model('User', UserSchema);
