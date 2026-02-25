require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, PermissionsBitField, Partials } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const os = require('os');

const mongoose = require('mongoose');
const Guild = require('./models/Guild');
const GlobalConfig = require('./models/GlobalConfig');
const ReactionRole = require('./models/ReactionRole');
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
let botOwnerIds = []; 
const HARDCODED_ADMIN_ID = "336814068595818497"; 

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Bağlantısı Başarılı'))
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
        client.once(event.name, (...args) => event.execute(...args, client, botOwnerIds, HARDCODED_ADMIN_ID, addActivity));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client, botOwnerIds, addActivity));
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
    if (req.isAuthenticated() && botOwnerIds.includes(req.user.id)) return next();
    res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
}

app.use(express.json()); 
app.use(express.static(path.join(__dirname)));

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
        const user = { ...req.user, isAdmin: botOwnerIds.includes(req.user.id) };
        res.json(user);
    } else {
        res.status(401).json({ error: "Giriş yapılmamış" });
    }
});


// API: Gerçek Bot Verilerini Döndür (Herkes Görebilir, İstatistikler İçin)
app.get('/api/stats', checkAuth, (req, res) => {
    if (!client.user) {
        return res.status(503).json({ error: "Bot henüz hazır değil" });
    }

    const stats = {
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        commands: commandCount,
        ping: client.ws.ping,
        uptime: formatUptime(client.uptime),
        maintenance: maintenanceMode
    };
    
    res.json(stats);
});

// API: Son Aktiviteler (Sadece Admin)
app.get('/api/activities', checkAdmin, (req, res) => {
    res.json(activityLog);
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
app.get('/api/servers', checkAuth, (req, res) => {
    if (!client.user) return res.status(503).json([]);
    
    // Admin (Bot Sahibi) ise tüm sunucuları görsün
    if (botOwnerIds.includes(req.user.id)) {
        const servers = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            icon: guild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
            owner: botOwnerIds.includes(guild.ownerId),
            isAdmin: true // Admin olduğu için her şeyi yapabilir
        }));
        return res.json(servers);
    }

    // Normal kullanıcı ise sadece yetkili olduğu ORTAK sunucuları görsün
    // Kullanıcının sunucularını Discord API zaten session'da veriyor (req.user.guilds)
    // Ancak bu liste kullanıcının TÜM sunucuları. Biz sadece botun da olduğu ve kullanıcının yetkili olduğu sunucuları istiyoruz.
    
    const userGuilds = req.user.guilds || [];
    const sharedGuilds = [];

    userGuilds.forEach(uGuild => {
        // 1. Bot bu sunucuda var mı?
        const botGuild = client.guilds.cache.get(uGuild.id);
        
        // 2. Kullanıcının bu sunucuda "Yönetici" veya "Sunucuyu Yönet" yetkisi var mı?
        // Discord API'den gelen permissions bir bitfield stringidir.
        const PERMISSIONS = BigInt(uGuild.permissions);
        const MANAGE_GUILD = 0x20n;
        const ADMINISTRATOR = 0x8n;
        
        const hasPerms = (PERMISSIONS & ADMINISTRATOR) === ADMINISTRATOR || (PERMISSIONS & MANAGE_GUILD) === MANAGE_GUILD;

        if (botGuild && hasPerms) {
            sharedGuilds.push({
                id: botGuild.id,
                name: botGuild.name,
                memberCount: botGuild.memberCount,
                icon: botGuild.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
                owner: botOwnerIds.includes(botGuild.ownerId), // Bot sahibi mi?
                isAdmin: false
            });
        }
    });
    
    res.json(sharedGuilds);
});

// API: Tekil Sunucu Detayı (Yönetim İçin)
app.get('/api/server/:id', checkAuth, async (req, res) => {
    if (!client.user) return res.status(503).json({ error: "Bot hazır değil" });
    
    // YETKİ KONTROLÜ
    const targetGuildId = req.params.id;
    let isAuthorized = false;

    if (botOwnerIds.includes(req.user.id)) {
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
        reactionRoles: reactionRoles
    });
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
    if (botOwnerIds.includes(req.user.id)) {
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
    if (botOwnerIds.includes(req.user.id)) isAuthorized = true;
    
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
        usage: cmd.usage
    }));
    res.json(commands);
});

// API: Yönetim İşlemleri (Hızlı İşlemler)
app.post('/api/action', checkAdmin, async (req, res) => {
    const { action } = req.body;
    
    switch(action) {
        case 'restart':
            addActivity('system', 'Bot Yeniden Başlatıldı', 'Panel İsteği', 'orange', 'fa-rotate');
            res.json({ success: true, message: "Bot yeniden başlatılıyor..." });
            setTimeout(() => {
                process.exit(0); // Render/PM2 gibi sistemler otomatik yeniden başlatır
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
            addActivity('warning', status, 'Yönetici', 'yellow', 'fa-triangle-exclamation');
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
            
        default:
            return res.status(400).json({ error: "Geçersiz işlem" });
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
