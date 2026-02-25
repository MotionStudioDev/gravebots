const mongoose = require('mongoose');

const GlobalConfigSchema = new mongoose.Schema({
    configId: { type: String, default: 'GLOBAL' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceReason: { type: String, default: 'Botumuz şu anda sizlere daha iyi hizmet verebilmek için bakıma alınmıştır.' }
});

module.exports = mongoose.model('GlobalConfig', GlobalConfigSchema);