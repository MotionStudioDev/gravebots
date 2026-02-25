const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Statik dosyaları sun (index.html, dashboard.html, resimler vb.)
app.use(express.static(path.join(__dirname)));

// Simüle edilmiş veritabanı (Gerçekte botun hafızasından veya DB'den gelecek)
let botStats = {
    servers: 1245,
    users: 452000, // 452K
    commands: 89200,
    ping: 24,
    uptime: "3 gün 12 saat"
};

let recentActivities = [
    { type: 'add', text: 'GraveBOT sunucuya eklendi', detail: 'Code Share Community', time: '2 dk önce', color: 'green', icon: 'fa-discord' },
    { type: 'premium', text: 'Premium Müzik Modu aktif edildi', detail: "Motion's Server", time: '15 dk önce', color: 'yellow', icon: 'fa-music' },
    { type: 'ban', text: 'Otomatik Ban Tetiklendi (Spam)', detail: 'Oyun Dünyası', time: '42 dk önce', color: 'red', icon: 'fa-gavel' },
    { type: 'add', text: 'GraveBOT sunucuya eklendi', detail: 'Test Sunucusu', time: '1 saat önce', color: 'green', icon: 'fa-discord' }
];

// API Endpoints
app.get('/api/stats', (req, res) => {
    // Her istekte sayıları biraz değiştirelim ki canlı gibi dursun :)
    botStats.servers += Math.floor(Math.random() * 2);
    botStats.users += Math.floor(Math.random() * 10);
    botStats.commands += Math.floor(Math.random() * 5);
    botStats.ping = 20 + Math.floor(Math.random() * 15);
    
    res.json(botStats);
});

app.get('/api/activities', (req, res) => {
    res.json(recentActivities);
});

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Panel yönlendirmesi
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(port, () => {
    console.log(`GraveBOT Panel sunucusu çalışıyor: http://localhost:${port}`);
});
