const fs = require('fs');
const path = require('path');

const floodConfigPath = path.join(__dirname, '../configs/flood-config.json');

const defaultConfig = {
    enabled: true,
    messageLimit: 5, // 5 mesaj
    messageTimeframe: 3000, // 3 saniye içinde
    commandLimit: 3, // 3 komut
    commandTimeframe: 5000, // 5 saniye içinde
    punishments: {
        warn: 1, // 1 kez flood => uyar
        mute: 2, // 2 kez flood => mute
        kick: 3, // 3 kez flood => kick
        ban: 4 // 4 kez flood => ban
    },
    muteDuration: 300000, // 5 dakika
    banDuration: 3600000, // 1 saat
    ignoreRoles: [], // Bu roller flood'dan etkilenmez
    logChannel: null // Log mesajları gönder
};

function loadConfig(guildId) {
    if (!fs.existsSync(path.dirname(floodConfigPath))) {
        fs.mkdirSync(path.dirname(floodConfigPath), { recursive: true });
    }

    let config = defaultConfig;

    if (fs.existsSync(floodConfigPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(floodConfigPath, 'utf8'));
            config = { ...defaultConfig, ...data };
        } catch (e) {
            console.error('Flood config yükleme hatası:', e);
        }
    }

    return config;
}

function saveConfig(newConfig) {
    if (!fs.existsSync(path.dirname(floodConfigPath))) {
        fs.mkdirSync(path.dirname(floodConfigPath), { recursive: true });
    }
    fs.writeFileSync(floodConfigPath, JSON.stringify(newConfig, null, 2));
}

module.exports = {
    loadConfig,
    saveConfig,
    defaultConfig
};
