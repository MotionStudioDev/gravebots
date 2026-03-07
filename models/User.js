const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    tag: { type: String, default: 'Bilinmiyor#0000' },
    avatar: { type: String, default: null },
    money: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    inventory: { type: Array, default: [] },
    badges: { type: Array, default: [] },
    invites: { type: Number, default: 0 },
    invitedBy: { type: String, default: null }
});

// Index'i kaldır çünkü userId zaten unique:true
// Eski 'id' index'i sorun yaratıyor

module.exports = mongoose.model('User', UserSchema);
