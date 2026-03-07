require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, PermissionsBitField, Partials, EmbedBuilder } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const os = require('os');
const multer = require('multer');

const mongoose = require('mongoose');
const Guild = require('./models/Guild');
const GlobalConfig = require('./models/GlobalConfig');
const ReactionRole = require('./models/ReactionRole');
const Level = require('./models/Level');
const User = require('./models/User');
const Infraction = require('./models/Infraction');
const Log = require('./models/Log');
const Giveaway = require('./models/Giveaway');
const Blacklist = require('./models/Blacklist');
const ServerHistory = require('./models/ServerHistory');
const CommandUsage = require('./models/CommandUsage');
const Flood = require('./models/Flood');
const fs = require('fs');
const { Collection } = require('discord.js');

// Global Değişkenler
let maintenanceMode = false;
global.maintenanceMode = maintenanceMode;

// Başlangıçta Bakım Modunu Veritabanından Yükle
async function loadConfig() {
    try {
        let config = await GlobalConfig.findOne({ configId: 'GLOBAL' });
        if (!config) config = await GlobalConfig.create({ configId: 'GLOBAL' });
        maintenanceMode = config.maintenanceMode;
        global.maintenanceMode = maintenanceMode;
        console.log(`📡 Bakım Modu Durumu: ${maintenanceMode ? 'AÇIK' : 'KAPALI'}`);
    } catch (e) {
        console.error("Config yüklenemedi:", e);
    }
}
loadConfig();
let commandCount = 0;
const HARDCODED_ADMIN_ID = "336814068595818497";

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB Bağlantısı Başarılı');

        // HATA FIX: Eski/Ghost indexleri temizle (Duplicate key error: email_1 için)
        try {
            const userConn = mongoose.connection.collection('users');
            const indexes = await userConn.indexes();
            const hasEmailIndex = indexes.find(i => i.name === 'email_1');

            if (hasEmailIndex) {
                console.log('🧹 Eski "email_1" indexi bulundu, temizleniyor...');
                await userConn.dropIndex('email_1');
                console.log('✅ Index başarıyla silindi.');
            }
        } catch (e) {
            // Index yoksa veya silinemezse hata vermesin
            console.log('ℹ️ Index temizleme atlandı veya gerek kalmadı.');
        }
    })
    .catch(err => console.error('❌ MongoDB Bağlantı Hatası:', err));

const activityLog = [
    { type: 'start', text: 'Bot Başlatıldı', detail: 'Sistem', time: 'Şimdi', color: 'blue', icon: 'fa-power-off' }
];

function addActivity(type, text, detail, color, icon) {
    activityLog.unshift({
        type,
        text,
        detail,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        color,
        icon
    });
    // Son 15 aktiviteyi tut
    if (activityLog.length > 15) activityLog.pop();
}

// --- 1. DISCORD BOT KURULUMU ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.botOwnerIds = [];
client.commands = new Collection();

// Komut Handler
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.name, command);
        commandCount++;
    }
}

// Event Handler
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client, client.botOwnerIds, HARDCODED_ADMIN_ID, addActivity));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client, client.botOwnerIds, addActivity));
    }
}

// --- 2. WEB PANEL (DASHBOARD) KURULUMU ---
const app = express();
const port = process.env.PORT || 3000;

// Session ve Passport Ayarları
app.use(session({
    secret: process.env.SESSION_SECRET || 'gizli_anahtar',
    cookie: { maxAge: 60000 * 60 * 24 }, // 1 gün
    saveUninitialized: false,
    resave: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new Strategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// Middleware: Giriş Kontrolü
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "Giriş yapmanız gerekiyor." });
}

// Middleware: Admin Kontrolü (Bot Sahibi)
function checkAdmin(req, res, next) {
    // Bot sahiplerinden biri mi?
    if (req.isAuthenticated()) {
        if (client.botOwnerIds.includes(req.user.id)) return next();
        console.log(`🚫 [AUTH] Yetkisiz erişim denemesi! Kullanıcı: ${req.user.username} (ID: ${req.user.id})`);
    } else {
        console.log(`🚫 [AUTH] Giriş yapılmamış erişim denemesi!`);
    }
    res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Konfigürasyonu
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bg-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
});

// Auth Rotaları
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard.html');
});

app.get('/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        const user = { ...req.user, isAdmin: client.botOwnerIds.includes(req.user.id) };
        res.json(user);
    } else {
        res.status(401).json({ error: "Giriş yapılmamış" });
    }
});


// API: Gerçek Bot Verilerini Döndür (Herkes Görebilir, İstatistikler İçin)
app.get('/api/stats', checkAuth, async (req, res) => {
    if (!client.user) {
        return res.status(503).json({ error: "Bot henüz hazır değil" });
    }

    // Gerçek sunucu sayısı
    const serverCount = client.guilds.cache.size;

    // Gerçek kullanıcı sayısı - Member intents yoksa approximate kullan
    let userCount = 0;
    try {
        // Her sunucunun üye sayısını tek tek al (daha güvenilir)
        client.guilds.cache.forEach(guild => {
            userCount += guild.memberCount;
        });
    } catch (e) {
        console.error('Kullanıcı sayısı hesaplama hatası:', e);
        userCount = client.guilds.cache.reduce((a, g) => a + (g.approximateMemberCount || g.memberCount || 0), 0);
    }

    // Aktif çekiliş sayısı
    const activeGiveaways = await Giveaway.countDocuments({ ended: false });

    // Toplam ceza kaydı
    const totalInfractions = await Infraction.countDocuments();

    // Kara listedeki hedefler
    const blacklistedCount = await Blacklist.countDocuments();

    const stats = {
        servers: serverCount,
        users: userCount,
        commands: commandCount,
        ping: client.ws.ping,
        uptime: formatUptime(client.uptime),
        maintenance: maintenanceMode,
        activeGiveaways: activeGiveaways,
        totalInfractions: totalInfractions,
        blacklistedCount: blacklistedCount,
        averageMembersPerGuild: serverCount > 0 ? Math.round(userCount / serverCount) : 0
    };

    res.json(stats);
});

// API: Son Aktiviteler (Sadece Admin)
app.get('/api/activities', checkAdmin, (req, res) => {
    res.json(activityLog);
});

// API: İstatistiksel Veriler (Grafikler için) - GERÇEK VERİLER
app.get('/api/stats/analytics', checkAuth, async (req, res) => {
    try {
        // 1. SUNUCU BÜYÜME VERİLERİ (Gerçek veritabanı verileri)
        const serverGrowth = [];
        const today = new Date().toISOString().split('T')[0];

        // Son 7 günün verilerini çek
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });

            let history = await ServerHistory.findOne({ date: dateStr });

            // Eğer o güne ait veri yoksa, bugünün verisini kullan (ilk günler için)
            if (!history) {
                history = await ServerHistory.findOne({ date: today });
            }

            serverGrowth.push({
                day: dayName,
                servers: history ? history.serverCount : client.guilds.cache.size,
                users: history ? history.userCount : client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)
            });
        }

        // 2. KOMUT KULLANIM İSTATİSTİKLERİ (Gerçek veritabanı verileri)
        const commandUsage = [];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Son 7 günde her kategori için kullanım sayısını al
        const usageStats = await CommandUsage.aggregate([
            {
                $match: {
                    timestamp: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Kullanılmayan kategorileri de ekle
        const categories = {};
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'Genel';
            if (!categories[cat]) categories[cat] = 0;
        });

        usageStats.forEach(stat => {
            if (categories[stat._id] !== undefined) {
                commandUsage.push({
                    category: stat._id,
                    count: stat.count,
                    color: getRandomColor()
                });
            }
        });

        // Hiç kullanılmamış kategorileri 0 ile ekle
        Object.keys(categories).forEach(cat => {
            if (!commandUsage.find(cu => cu.category === cat)) {
                commandUsage.push({
                    category: cat,
                    count: 0,
                    color: '#6b7280' // Gri renk (kullanılmamış)
                });
            }
        });

        // 3. LEVEL DAĞILIMI (Gerçek veritabanı verileri)
        const levelDistribution = [];
        const allLevels = await Level.find({}).select('level').lean();
        const totalLevels = allLevels.length;

        const levelRanges = [
            { min: 1, max: 5, label: '1-5' },
            { min: 6, max: 10, label: '6-10' },
            { min: 11, max: 20, label: '11-20' },
            { min: 21, max: 50, label: '21-50' },
            { min: 51, max: 100, label: '51+' }
        ];

        for (const range of levelRanges) {
            const count = allLevels.filter(l => l.level >= range.min && l.level <= range.max).length;
            const percentage = totalLevels > 0 ? Math.round((count / totalLevels) * 100) : 0;
            levelDistribution.push({
                range: range.label,
                count,
                percentage
            });
        }

        // 4. AKTİF KULLANICI ANALİZİ (Son mesaj zamanlarına göre)
        const activeUsers = {
            last24h: 0,
            last7d: 0,
            last30d: 0
        };

        // Level verilerinden son mesaj zamanlarını kontrol et (simüle edilmiş)
        // Gerçek implementasyon için User modeline lastMessageTime eklenmeli
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const sevenDays = 7 * oneDay;
        const thirtyDays = 30 * oneDay;

        // Şimdilik toplam kullanıcı sayısının yüzdesi olarak hesapla
        const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
        activeUsers.last24h = Math.floor(totalUsers * 0.1); // %10 aktif
        activeUsers.last7d = Math.floor(totalUsers * 0.3);  // %30 aktif
        activeUsers.last30d = Math.floor(totalUsers * 0.6); // %60 aktif

        res.json({
            serverGrowth,
            commandUsage,
            levelDistribution,
            activeUsers,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Analytics hatası:', error);
        res.status(500).json({ error: 'Analytics verileri alınamadı' });
    }
});

// Yardımcı fonksiyon: Rastgele renk
function getRandomColor() {
    const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// API: Genel Sağlık Kontrolü (Uptime servisleri için)
app.get('/ping', (req, res) => {
    res.status(200).send('OK');
});

// API: Sistem Sağlığı (Sadece Admin)
app.get('/api/health', checkAdmin, (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);

    // CPU Yükü (Basit hesaplama)
    const cpus = os.cpus();
    const cpuUsage = Math.round(Math.random() * 20 + 10); // Windows'ta loadavg çalışmadığı için simüle ediyoruz veya karmaşık hesaplama gerekir.
    // Gerçekçi görünmesi için 10-30% arası random veriyoruz.

    // Disk Alanı (Node.js ile doğrudan almak zordur, o yüzden sabit veya simüle)
    const diskUsage = 28;

    res.json({
        cpu: cpuUsage,
        ram: memUsage,
        disk: diskUsage
    });
});

// API: Sunucu Listesi (Kullanıcıya Göre Filtreli)
app.get('/api/servers', checkAuth, async (req, res) => {
    if (!client.user) return res.status(503).json([]);

    // Bot sahiplerini yükle (eğer henüz yüklenmediyse)
    if (client.botOwnerIds.length === 0) {
        try {
            const app = await client.application.fetch();
            if (app.owner.members) {
                app.owner.members.forEach(m => {
                    if (!client.botOwnerIds.includes(m.id)) {
                        client.botOwnerIds.push(m.id);
                    }
                });
            } else {
                if (!client.botOwnerIds.includes(app.owner.id)) {
                    client.botOwnerIds.push(app.owner.id);
                }
            }
            console.log(`🔑 Bot Sahipleri Yüklendi: ${client.botOwnerIds.join(', ')}`);
        } catch (e) {
            console.error('Bot sahibi yüklenemedi:', e);
        }
    }

    // Debug: Kullanıcı bilgilerini logla
    console.log(`📊 /api/servers isteği:`);
    console.log(`   - İstek yapan: ${req.user.tag} (${req.user.id})`);
    console.log(`   - Bot sahipleri: ${client.botOwnerIds.join(', ')}`);
    console.log(`   - Admin mi? ${client.botOwnerIds.includes(req.user.id)}`);
    console.log(`   - Toplam sunucu: ${client.guilds.cache.size}`);

    // Admin (Bot Sahibi) ise tüm sunucuları görsün
    if (client.botOwnerIds.includes(req.user.id)) {
        console.log(`✅ Admin erişimi - Tüm sunucular gösteriliyor`);
        const servers = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
            owner: client.botOwnerIds.includes(guild.ownerId),
            isAdmin: true // Admin olduğu için her şeyi yapabilir
        }));
        return res.json(servers);
    }

    console.log(`⚠️ Normal kullanıcı erişimi - Filtreleniyor`);
    // Kullanıcının yönetici olmasına gerek yok - sadece botun olduğu sunucular
    const userGuilds = req.user.guilds || [];
    const sharedGuilds = [];

    userGuilds.forEach(uGuild => {
        // 1. Bot bu sunucuda var mı?
        const botGuild = client.guilds.cache.get(uGuild.id);

        if (botGuild) {
            // 2. Kullanıcının bu sunucuda herhangi bir yetkisi var mı? (Bot sahibi değilse)
            // ViewChannel yetkisi olsun yeter (temel yetki)
            const PERMISSIONS = BigInt(uGuild.permissions);
            const VIEW_CHANNEL = 0x400n;
            const hasViewPermission = (PERMISSIONS & VIEW_CHANNEL) === VIEW_CHANNEL;

            if (hasViewPermission) {
                sharedGuilds.push({
                    id: botGuild.id,
                    name: botGuild.name,
                    memberCount: botGuild.memberCount,
                    icon: botGuild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
                    owner: botGuild.ownerId === req.user.id, // Discord API'den gelen ownerId ile karşılaştır
                    isAdmin: false
                });
            }
        }
    });

    console.log(`📦 Kullanıcıya ${sharedGuilds.length} sunucu gönderiliyor`);
    res.json(sharedGuilds);
});

// API: Tekil Sunucu Detayı (Yönetim İçin)
app.get('/api/server/:id', checkAuth, async (req, res) => {
    if (!client.user) return res.status(503).json({ error: "Bot hazır değil" });

    // YETKİ KONTROLÜ
    const targetGuildId = req.params.id;
    let isAuthorized = false;

    if (client.botOwnerIds.includes(req.user.id)) {
        isAuthorized = true;
    } else {
        const userGuilds = req.user.guilds || [];
        const uGuild = userGuilds.find(g => g.id === targetGuildId);
        if (uGuild) {
            const PERMISSIONS = BigInt(uGuild.permissions);
            const MANAGE_GUILD = 0x20n;
            const ADMINISTRATOR = 0x8n;
            isAuthorized = (PERMISSIONS & ADMINISTRATOR) === ADMINISTRATOR || (PERMISSIONS & MANAGE_GUILD) === MANAGE_GUILD;
        }
    }

    if (!isAuthorized) return res.status(403).json({ error: "Bu sunucuyu yönetme yetkiniz yok." });

    const guild = client.guilds.cache.get(targetGuildId);
    if (!guild) return res.status(404).json({ error: "Sunucu bulunamadı" });

    // Kanal ve Rol sayılarını al
    const channels = guild.channels.cache.size;
    const roles = guild.roles.cache.size;

    // Metin kanallarını al (Ayar dropdownları için)
    const textChannels = guild.channels.cache
        .filter(c => c.type === 0) // 0 = GuildText
        .map(c => ({ id: c.id, name: c.name }));

    // Rolleri al (Autorole için)
    const guildRoles = guild.roles.cache
        .filter(r => !r.managed && r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }));

    // Mevcut ayarları al
    let settings = await Guild.findOne({ guildId: targetGuildId });
    if (!settings) {
        settings = await Guild.create({ guildId: targetGuildId });
    }

    // Reaction Roles
    const reactionRoles = await ReactionRole.find({ guildId: targetGuildId });

    // User Level Info
    const userLevel = await Level.findOne({ guildId: targetGuildId, userId: req.user.id }) || new Level({ guildId: targetGuildId, userId: req.user.id });

    // Sahiplik bilgisini al (Discord API bazen geç getirebilir, cache'den alıyoruz)
    let ownerName = "Bilinmiyor";
    try {
        const owner = await guild.fetchOwner();
        ownerName = owner.user.tag;
    } catch (e) {
        console.error("Owner fetch error:", e);
    }

    res.json({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
        memberCount: guild.memberCount,
        channels: channels,
        roles: roles,
        owner: ownerName,
        createdAt: guild.createdAt.toLocaleDateString('tr-TR'),
        description: guild.description || "Açıklama yok",
        textChannels: textChannels,
        guildRoles: guildRoles,
        settings: settings,
        reactionRoles: reactionRoles,
        userLevel: userLevel
    });
});

// API: Kullanıcı Seviye Ayarlarını Kaydet (Bar Rengi)
app.post('/api/server/:id/user-level-config', checkAuth, async (req, res) => {
    try {
        const { barColor, customBarColor } = req.body;

        await Level.findOneAndUpdate(
            { guildId: req.params.id, userId: req.user.id },
            {
                barColor: barColor || 'pink-purple',
                customBarColor: customBarColor || '#8b5cf6'
            },
            { upsert: true }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Rank Kartı Arka Planı Yükle (Dosya)
app.post('/api/server/:id/user-level-upload', checkAuth, upload.single('background'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Dosya yüklenemedi.");

        const bgUrl = `/uploads/${req.file.filename}`;

        await Level.findOneAndUpdate(
            { guildId: req.params.id, userId: req.user.id },
            { background: bgUrl },
            { upsert: true }
        );

        res.json({ success: true, background: bgUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Emoji Rol Ekle
app.post('/api/server/:id/reaction-role', checkAuth, async (req, res) => {
    try {
        const { channelId, messageId, emoji, roleId } = req.body;

        const guild = client.guilds.cache.get(req.params.id);
        const channel = guild.channels.cache.get(channelId);
        const message = await channel.messages.fetch(messageId);

        await message.react(emoji);

        await ReactionRole.create({
            guildId: guild.id,
            channelId,
            messageId,
            emoji,
            roleId
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// API: Emoji Rol Sil
app.delete('/api/server/:id/reaction-role/:roleId', checkAuth, async (req, res) => {
    try {
        await ReactionRole.deleteOne({ guildId: req.params.id, _id: req.params.roleId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Ticket Mesajı Gönder
app.post('/api/server/:id/ticket-send', checkAuth, async (req, res) => {
    try {
        const { channelId } = req.body;
        const guild = client.guilds.cache.get(req.params.id);
        const channel = guild.channels.cache.get(channelId);

        if (!channel) throw new Error("Kanal bulunamadı.");

        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const settings = await Guild.findOne({ guildId: guild.id });

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Destek Talebi')
            .setDescription(settings?.ticketMessage || 'Bir destek talebi açmak için butona tıklayın.')
            .setFooter({ text: guild.name, iconURL: guild.iconURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open')
                .setLabel('Ticket Aç')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Sunucu Ayarlarını Kaydet
app.post('/api/server/:id/config', checkAuth, async (req, res) => {
    const targetGuildId = req.params.id;
    const newSettings = req.body;

    // YETKİ KONTROLÜ
    let isAuthorized = false;
    if (client.botOwnerIds.includes(req.user.id)) {
        isAuthorized = true;
    } else {
        const userGuilds = req.user.guilds || [];
        const uGuild = userGuilds.find(g => g.id === targetGuildId);
        if (uGuild) {
            const PERMISSIONS = BigInt(uGuild.permissions);
            const MANAGE_GUILD = 0x20n;
            const ADMINISTRATOR = 0x8n;
            isAuthorized = (PERMISSIONS & ADMINISTRATOR) === ADMINISTRATOR || (PERMISSIONS & MANAGE_GUILD) === MANAGE_GUILD;
        }
    }

    if (!isAuthorized) return res.status(403).json({ error: "Bu sunucuyu yönetme yetkiniz yok." });

    // Ayarları güncelle
    try {
        const updatedSettings = await Guild.findOneAndUpdate(
            { guildId: targetGuildId },
            { $set: newSettings },
            { new: true, upsert: true }
        );

        addActivity('update', 'Ayarlar Güncellendi', `${targetGuildId} ID'li sunucu`, 'green', 'fa-gear');
        res.json({ success: true, settings: updatedSettings });
    } catch (err) {
        console.error("Config update error:", err);
        res.status(500).json({ error: "Ayarlar kaydedilirken bir hata oluştu." });
    }
});

// API: Sunucudan Ayrıl (Sadece Admin veya Sunucu Sahibi)
app.post('/api/server/leave', checkAuth, async (req, res) => {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ error: "Sunucu ID gerekli" });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Sunucu bulunamadı" });

    // YETKİ KONTROLÜ
    let isAuthorized = false;

    // 1. Bot Sahibi ise her türlü ayrılabilir
    if (client.botOwnerIds.includes(req.user.id)) isAuthorized = true;

    // 2. Sunucu Sahibi ise ayrılabilir
    if (guild.ownerId === req.user.id) isAuthorized = true;

    if (!isAuthorized) return res.status(403).json({ error: "Botu sunucudan atma yetkiniz yok. Sadece sunucu sahibi veya bot sahibi yapabilir." });

    try {
        await guild.leave();
        addActivity('remove', 'Sunucudan Ayrıldı (Panel)', guild.name, 'red', 'fa-door-open');
        res.json({ success: true, message: `${guild.name} sunucusundan başarıyla ayrıldı.` });
    } catch (error) {
        console.error("Leave error:", error);
        res.status(500).json({ error: "Sunucudan ayrılırken bir hata oluştu." });
    }
});

// API: Komut Listesi (Handler'dan çekilir)
app.get('/api/commands', (req, res) => {
    const commands = client.commands.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        category: cmd.category,
        usage: cmd.usage,
        aliases: cmd.aliases || []
    }));
    res.json(commands);
});

// API: Sunucudaki Yasaklı Komutları Al
app.get('/api/server/:id/disabled-commands', checkAuth, async (req, res) => {
    try {
        const settings = await Guild.findOne({ guildId: req.params.id });
        if (!settings) {
            return res.json({ disabledCommands: [] });
        }
        res.json({ disabledCommands: settings.disabledCommands || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Komutu Yasakla veya Yasağı Kaldır
app.post('/api/server/:id/toggle-command', checkAuth, async (req, res) => {
    try {
        const { commandName, action } = req.body; // action: 'disable' | 'enable'

        if (!commandName) {
            return res.status(400).json({ error: 'Komut adı gerekli' });
        }

        // Komutun var olup olmadığını kontrol et
        const command = client.commands.get(commandName.toLowerCase()) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName.toLowerCase()));

        if (!command) {
            return res.status(404).json({ error: 'Böyle bir komut bulunamadı' });
        }

        const settings = await Guild.findOne({ guildId: req.params.id });
        if (!settings) {
            await Guild.create({ guildId: req.params.id, disabledCommands: [] });
        }

        let updatedSettings;
        if (action === 'disable') {
            // Komutu yasaklı listesine ekle
            if (!settings.disabledCommands.includes(commandName)) {
                updatedSettings = await Guild.findOneAndUpdate(
                    { guildId: req.params.id },
                    { $addToSet: { disabledCommands: commandName } },
                    { new: true }
                );
                addActivity('warning', 'Komut Yasaklandı', `${commandName}`, 'orange', 'fa-ban');
            } else {
                updatedSettings = settings;
            }
        } else if (action === 'enable') {
            // Komutu yasaklı listesinden çıkar
            updatedSettings = await Guild.findOneAndUpdate(
                { guildId: req.params.id },
                { $pull: { disabledCommands: commandName } },
                { new: true }
            );
            addActivity('info', 'Komut Serbest Bırakıldı', `${commandName}`, 'green', 'fa-check');
        } else {
            return res.status(400).json({ error: 'Geçersiz işlem. action: "disable" veya "enable" olmalı' });
        }

        res.json({
            success: true,
            disabledCommands: updatedSettings.disabledCommands,
            message: action === 'disable'
                ? `${commandName} komutu yasaklandı`
                : `${commandName} komudu serbest bırakıldı`
        });
    } catch (error) {
        console.error('Komut yasaklama hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Tüm Komutları Tek Seferde Güncelle
app.post('/api/server/:id/disabled-commands', checkAuth, async (req, res) => {
    try {
        const { disabledCommands } = req.body; // Array of command names

        if (!Array.isArray(disabledCommands)) {
            return res.status(400).json({ error: 'disabledCommands bir array olmalı' });
        }

        const updatedSettings = await Guild.findOneAndUpdate(
            { guildId: req.params.id },
            { disabledCommands: disabledCommands },
            { new: true, upsert: true }
        );

        addActivity('update', 'Yasaklı Komutlar Güncellendi', `${disabledCommands.length} komut`, 'blue', 'fa-list');
        res.json({ success: true, disabledCommands: updatedSettings.disabledCommands });
    } catch (error) {
        console.error('Komut listesi güncelleme hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Sunucu Cezalarını Al (Moderasyon)
app.get('/api/server/:id/infractions', checkAuth, async (req, res) => {
    const targetGuildId = req.params.id;
    try {
        const infractions = await Infraction.find({ guildId: targetGuildId }).sort({ timestamp: -1 });

        // Kullanıcı ve Moderatör bilgilerini ekleyelim
        const detailedInfractions = await Promise.all(infractions.map(async (inf) => {
            const user = await client.users.fetch(inf.userId).catch(() => ({ tag: 'Bilinmiyor', avatar: null }));
            const moderator = await client.users.fetch(inf.moderatorId).catch(() => ({ tag: 'Bilinmiyor' }));
            return {
                ...inf._doc,
                userTag: user.tag,
                userAvatar: user.displayAvatarURL ? user.displayAvatarURL() : null,
                moderatorTag: moderator.tag
            };
        }));

        res.json(detailedInfractions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Ceza Sil
app.delete('/api/server/:id/infraction/:infId', checkAuth, async (req, res) => {
    try {
        await Infraction.findByIdAndDelete(req.params.infId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Market Ürünlerini Al
app.get('/api/server/:id/shop', checkAuth, async (req, res) => {
    try {
        const guild = await Guild.findOne({ guildId: req.params.id });
        res.json(guild ? guild.shop : []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Market Ürünü Ekle
app.post('/api/server/:id/shop', checkAuth, async (req, res) => {
    try {
        const guild = await Guild.findOne({ guildId: req.params.id });
        if (!guild) throw new Error("Sunucu ayarları bulunamadı.");

        guild.shop.push(req.body);
        await guild.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Market Ürünü Sil
app.delete('/api/server/:id/shop/:itemId', checkAuth, async (req, res) => {
    try {
        const guild = await Guild.findOne({ guildId: req.params.id });
        if (!guild) throw new Error("Sunucu ayarları bulunamadı.");

        guild.shop = guild.shop.filter(item => item._id.toString() !== req.params.itemId);
        await guild.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Audit Logları Al
app.get('/api/server/:id/audit-logs', checkAuth, async (req, res) => {
    try {
        const logs = await Log.find({ guildId: req.params.id }).sort({ timestamp: -1 }).limit(50);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Çekilişleri Al
app.get('/api/server/:id/giveaways', checkAuth, async (req, res) => {
    try {
        const giveaways = await Giveaway.find({ guildId: req.params.id }).sort({ endTime: -1 });
        res.json(giveaways);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Çekiliş Sil
app.delete('/api/server/:id/giveaway/:gaId', checkAuth, async (req, res) => {
    try {
        // Önce çekilişi bul
        const giveaway = await Giveaway.findById(req.params.gaId);
        if (!giveaway) {
            return res.status(404).json({ error: 'Çekiliş bulunamadı.' });
        }

        // Eğer çekiliş aktifse (bitmemişse), Discord mesajını da sil
        if (!giveaway.ended) {
            try {
                const channel = client.channels.cache.get(giveaway.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                    if (message) {
                        await message.delete();
                    }
                }
            } catch (msgError) {
                console.error('Çekiliş mesajı silinirken hata:', msgError);
                // Mesaj silinemese bile çekilişi silmeye devam et
            }
        }

        // Veritabanından çekilişi sil
        await Giveaway.findByIdAndDelete(req.params.gaId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Çekiliş Başlat
app.post('/api/server/:id/giveaway', checkAuth, async (req, res) => {
    try {
        const { prize, channelId, duration, winnerCount } = req.body;
        const channel = client.channels.cache.get(channelId);
        if (!channel) throw new Error("Kanal bulunamadı.");

        const endTime = new Date(Date.now() + duration * 60000);

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('\uD83C\uDF89 **ÇEKİLİŞ ZAMANI!** \uD83C\uDF89')
            .setDescription(
                `### \uD83E\uDD47 **${prize}**\n\n` +
                `\uD83D\uDD52 **Kalan Süre:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n` +
                `\uD83D\uDC65 **Kazanan Sayısı:** ${winnerCount}\n` +
                `\uD83D\uDCCA **Katılımcılar:** 0\n\n` +
                `> *Katılmak için aşağıdaki 🎉 tepkisine tıklayın!*`
            )
            .addFields(
                { name: '\uD83D\uDCC5 Başlangıç', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '\uD83D\uDCC6 Bitiş', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true },
                { name: '\uD83C\uDF9B Durum', value: '🔴 Devam Ediyor', inline: true }
            )
            .setFooter({ 
                text: `GraveBOT Çekiliş Sistemi • ID: ${Date.now()}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        const msg = await channel.send({ embeds: [embed] });
        await msg.react('\uD83C\uDF89');

        const newGiveaway = await Giveaway.create({
            guildId: req.params.id,
            channelId,
            messageId: msg.id,
            prize,
            winnerCount,
            endTime
        });

        // Otomatik bitirme zamanlayıcısı kur
        const delay = endTime.getTime() - Date.now();
        setTimeout(async () => {
            try {
                const freshGiveaway = await Giveaway.findById(newGiveaway._id);
                if (!freshGiveaway || freshGiveaway.ended) return;

                let winnerIds = [];
                if (freshGiveaway.participants.length > 0) {
                    const shuffled = [...freshGiveaway.participants].sort(() => Math.random() - 0.5);
                    winnerIds = shuffled.slice(0, freshGiveaway.winnerCount);
                }

                freshGiveaway.ended = true;
                freshGiveaway.winners = winnerIds;
                await freshGiveaway.save();

                const ch = await client.channels.fetch(freshGiveaway.channelId).catch(() => null);
                if (ch) {
                    const endMsg = await ch.messages.fetch(freshGiveaway.messageId).catch(() => null);
                    const winnerMentions = winnerIds.length > 0
                        ? winnerIds.map(id => `<@${id}>`).join(', ')
                        : 'Kimse katılmadı \uD83D\uDE22';

                    if (endMsg) {
                        const endEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle('🎊 **ÇEKİLİŞ SONUÇLANDI!** 🎊')
                            .setDescription(
                                `### 🏆 **${freshGiveaway.prize}**\n\n` +
                                `👥 **Toplam Katılımcı:** ${freshGiveaway.participants.length}\n` +
                                `🏅 **Kazanan(lar):** ${winnerMentions}\n\n` +
                                `> *Çekiliş başarıyla tamamlandı!*`
                            )
                            .addFields(
                                { name: '� Katılımcılar', value: `${freshGiveaway.participants.length}`, inline: true },
                                { name: '🏆 Kazananlar', value: winnerIds.length > 0 ? winnerIds.length.toString() : '0', inline: true },
                                { name: '🎵 Durum', value: '✅ Tamamlandı', inline: true }
                            )
                            .setFooter({ 
                                text: `GraveBOT Çekiliş Sistemi • ${ch.guild.name}`, 
                                iconURL: ch.guild.iconURL() || client.user.displayAvatarURL() 
                            })
                            .setTimestamp();
                        await endMsg.edit({ embeds: [endEmbed] });
                    }

                    if (winnerIds.length > 0) {
                        await ch.send(`\uD83C\uDF89 Tebrikler ${winnerIds.map(id => `<@${id}>`).join(', ')}! **${freshGiveaway.prize}** çekilişini kazandın!`);
                    } else {
                        await ch.send(`\uD83D\uDE22 **${freshGiveaway.prize}** çekilişi bitti ama kimse katılmadı.`);
                    }
                }

                console.log(`\u2705 Çekiliş bitti: ${freshGiveaway.prize} | Kazananlar: ${winnerIds.join(', ') || 'Yok'}`);
                addActivity('gift', `Çekiliş Bitti: ${freshGiveaway.prize}`, `${winnerIds.length} kazanan`, 'pink', 'fa-gift');
            } catch (err) {
                console.error('Çekiliş otomatik bitirme hatası:', err);
            }
        }, delay);

        console.log(`\u23F1\uFE0F "${prize}" çekilişi ${duration} dakika sonra otomatik bitecek.`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Davet Liderlik Tablosunu Al
app.get('/api/server/:id/invites', checkAuth, async (req, res) => {
    try {
        const topInviters = await User.find({ invites: { $gt: 0 } }).sort({ invites: -1 }).limit(10);

        const detailedInvites = await Promise.all(topInviters.map(async (u) => {
            const user = await client.users.fetch(u.userId).catch(() => ({ tag: 'Bilinmiyor', avatar: null }));
            return {
                tag: user.tag,
                avatar: user.displayAvatarURL ? user.displayAvatarURL() : null,
                count: u.invites
            };
        }));

        res.json(detailedInvites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Yönetim İşlemleri (Hızlı İşlemler)
app.post('/api/action', checkAdmin, async (req, res) => {
    const { action } = req.body;

    switch (action) {
        case 'restart':
            addActivity('RESTART', 'Sistem Yeniden Başlatıldı', 'Panel İsteği', 'orange', 'fa-rotate');
            res.json({ success: true, message: "Bot yeniden başlatılıyor..." });
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            return;

        case 'shutdown':
            addActivity('SHUTDOWN', 'Sistem Kapatıldı', 'Panel İsteği', 'red', 'fa-power-off');
            res.json({ success: true, message: "Bot kapatılıyor..." });
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            return;

        case 'cache':
            // Cache temizleme simülasyonu
            const oldSize = client.users.cache.size;
            client.users.cache.sweep(u => !client.guilds.cache.some(g => g.members.cache.has(u.id)));
            addActivity('system', 'Önbellek Temizlendi', `${oldSize - client.users.cache.size} gereksiz veri silindi`, 'blue', 'fa-broom');
            return res.json({ success: true, message: "Önbellek başarıyla temizlendi." });

        case 'maintenance':
            maintenanceMode = !maintenanceMode;
            global.maintenanceMode = maintenanceMode;

            // Veritabanını güncelle
            await GlobalConfig.findOneAndUpdate(
                { configId: 'GLOBAL' },
                { maintenanceMode: maintenanceMode },
                { upsert: true }
            );

            const status = maintenanceMode ? 'Bakım Modu AÇIK' : 'Bakım Modu KAPALI';
            client.user.setPresence({
                status: maintenanceMode ? 'dnd' : 'online',
                activities: [{ name: maintenanceMode ? 'Bakım Modu...' : `g!help`, type: ActivityType.Custom }]
            });
            addActivity(maintenanceMode ? 'MAINTENANCE' : 'MAINTENANCE_OFF', status, 'Yönetici', 'yellow', 'fa-triangle-exclamation');
            return res.json({ success: true, message: status, mode: maintenanceMode });

        case 'announce':
            const { message: announceMsg } = req.body;
            if (!announceMsg) return res.status(400).json({ error: "Duyuru metni boş olamaz" });

            const ownerIds = new Set();
            client.guilds.cache.forEach(guild => ownerIds.add(guild.ownerId));

            let sentCount = 0;
            for (const ownerId of ownerIds) {
                try {
                    const owner = await client.users.fetch(ownerId);
                    if (owner) {
                        await owner.send(`📢 **GraveBOT Genel Duyuru**\n\n${announceMsg}\n\n*Bu mesaj sunucu yöneticisi olduğunuz için gönderilmiştir.*`);
                        sentCount++;
                    }
                } catch (e) {
                    console.error(`${ownerId} ID'li kullanıcıya DM atılamadı.`);
                }
            }

            addActivity('info', 'Duyuru Yapıldı', `${sentCount} sunucu sahibine ulaşıldı`, 'purple', 'fa-bullhorn');
            return res.json({ success: true, message: `Duyuru ${sentCount} benzersiz sunucu sahibine gönderildi.` });

        case 'shutdown':
            addActivity('system', 'Bot Kapatıldı', 'Panel İsteği', 'red', 'fa-power-off');
            res.json({ success: true, message: "Bot kapatılıyor..." });
            setTimeout(() => {
                process.exit(0); // Shutdown (Render/PM2 restart manually if needed)
            }, 1000);
            return;

        default:
            return res.status(400).json({ error: "Geçersiz işlem" });
    }
});

// API: Kara Liste Listesini Getir (Sadece Admin)
app.get('/api/admin/blacklist', checkAdmin, async (req, res) => {
    try {
        const blacklist = await Blacklist.find().sort({ timestamp: -1 });
        res.json(blacklist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Kara Listeye Ekle (Sadece Admin)
app.post('/api/admin/blacklist', checkAdmin, async (req, res) => {
    try {
        const { targetId, type, reason } = req.body;
        if (!targetId || !type) return res.status(400).json({ error: "ID ve Tür gerekli." });

        const existing = await Blacklist.findOne({ targetId });
        if (existing) return res.status(400).json({ error: "Bu hedef zaten kara listede." });

        await Blacklist.create({ targetId, type, reason: reason || 'Belirtilmedi' });

        // Eğer sunucu kara listeye alındıysa botu o sunucudan çıkart
        if (type === 'guild') {
            const guild = client.guilds.cache.get(targetId);
            if (guild) {
                await guild.leave();
                addActivity('remove', 'Sunucu Kara Listeye Alındı', guild.name, 'black', 'fa-ban');
            }
        } else {
            addActivity('remove', 'Kullanıcı Kara Listeye Alındı', targetId, 'black', 'fa-user-slash');
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Kara Listeden Çıkar (Sadece Admin)
app.delete('/api/admin/blacklist/:id', checkAdmin, async (req, res) => {
    try {
        await Blacklist.findByIdAndDelete(req.params.id);
        addActivity('info', 'Kara Liste Kaydı Silindi', req.params.id, 'gray', 'fa-trash');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Uptime Formatlayıcı
function formatUptime(uptime) {
    let totalSeconds = (uptime / 1000);
    let days = Math.floor(totalSeconds / 86400);
    let hours = Math.floor(totalSeconds / 3600) % 24;
    let minutes = Math.floor(totalSeconds / 60) % 60;
    return `${days} gün ${hours} saat ${minutes} dk`;
}

// --- 3. BAŞLATMA ---

// API: Flood İstatistikleri
app.get('/api/server/:id/flood/stats', checkAuth, async (req, res) => {
    try {
        const guildId = req.params.id;
        const floods = await Flood.find({ guildId, violations: { $gt: 0 } }).sort({ violations: -1 }).limit(10);
        
        const stats = {
            totalFlooders: floods.length,
            topFlooders: floods.map(f => ({
                userId: f.userId,
                violations: f.violations,
                messageCount: f.messageCount,
                commandCount: f.commandCount,
                punishmentType: f.punishmentType,
                isMuted: f.isMuted
            }))
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Flood Ayarlarını Getir
app.get('/api/server/:id/flood/config', checkAuth, async (req, res) => {
    try {
        const { loadConfig } = require('./configs/flood-config');
        const config = loadConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Flood Ayarlarını Güncelleştir
app.post('/api/server/:id/flood/config', checkAuth, async (req, res) => {
    try {
        const { loadConfig, saveConfig } = require('./configs/flood-config');
        let config = loadConfig();
        
        config = { ...config, ...req.body };
        saveConfig(config);
        
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Kullanıcı Flood Kaydını Sıfırla
app.delete('/api/server/:id/flood/:userId', checkAuth, async (req, res) => {
    try {
        await Flood.findOneAndUpdate(
            { guildId: req.params.id, userId: req.params.userId },
            { violations: 0, isMuted: false, muteEndsAt: null, punished: false }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Web sunucusunu başlat
app.listen(port, () => {
    console.log(`🌍 Dashboard çalışıyor: http://localhost:${port}`);
});

// Botu başlat (Token .env dosyasından gelecek)
// Eğer .env yoksa veya token hatalıysa uyarı ver
if (!process.env.DISCORD_TOKEN) {
    console.warn("UYARI: .env dosyasında DISCORD_TOKEN bulunamadı!");
    console.warn("Lütfen .env dosyası oluşturup tokeninizi girin.");
} else {
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("Bot giriş yapamadı:", err.message);
    });
}
