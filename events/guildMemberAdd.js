const User = require('../models/User');
const Log = require('../models/Log');
const Guild = require('../models/Guild');
const { sendModLog } = require('../utils/modlog');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont } = require('canvas');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guild = member.guild;

        // --- DAVET TAKİP MANTIĞI ---
        const cachedInvites = client.invites.get(guild.id);
        const newInvites = await guild.invites.fetch().catch(() => null);

        let inviter = null;
        let usedInvite = null;

        if (cachedInvites && newInvites) {
            usedInvite = newInvites.find(inv => inv.uses > (cachedInvites.get(inv.code) || 0));
            if (usedInvite) {
                inviter = usedInvite.inviter;
                // Önbelleği güncelle
                client.invites.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
            }
        }

        // MongoDB Ayarları
        const settings = await Guild.findOne({ guildId: guild.id });
        if (!settings) return;

        // --- DAVET SİSTEMİ MESAJI ---
        if (settings.inviteSystem?.status && inviter) {
            // Davet edeni veritabanına kaydet/güncelle
            let inviterData = await User.findOne({ userId: inviter.id });
            if (!inviterData) {
                inviterData = await User.create({
                    userId: inviter.id,
                    tag: inviter.tag,
                    avatar: inviter.displayAvatarURL()
                });
            }

            inviterData.invites = (inviterData.invites || 0) + 1;
            await inviterData.save();

            // Davet kanalı ayarlıysa mesaj gönder
            if (settings.inviteSystem.channel) {
                const logChannel = guild.channels.cache.get(settings.inviteSystem.channel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setAuthor({ name: 'Üye Katıldı', iconURL: member.user.displayAvatarURL() })
                        .setDescription(`👋 <@${member.id}> sunucuya katıldı!\n\n**Davet Eden:** <@${inviter.id}> (${inviter.tag})\n**Davet Sayısı:** \`${inviterData.invites}\` davet\n**Davet Kodu:** \`${usedInvite.code}\``)
                        .setTimestamp()
                        .setFooter({ text: `ID: ${member.id}` });
                    logChannel.send({ embeds: [embed] }).catch(() => { });
                }
            }
            console.log(`📡 [INVITE] ${member.user.tag} katıldı. Davet eden: ${inviter.tag}`);
        }

        // --- OTO-ROL SİSTEMİ ---
        if (settings.autoroleStatus && settings.autorole) {
            // Botlara otorol vermeyelim
            if (member.user.bot) {
                console.log(`ℹ️ [AUTOROLE] ${member.user.tag} bir bot olduğu için otorol atlandı.`);
            } else {
                const role = guild.roles.cache.get(settings.autorole);
                if (!role) {
                    console.error(`❌ [AUTOROLE] ${guild.name} sunucusunda ayarlı rol (${settings.autorole}) bulunamadı!`);
                } else {
                    // Bot yetki kontrolü
                    const botMember = await guild.members.fetchMe();
                    if (!botMember.permissions.has('ManageRoles')) {
                        console.error(`❌ [AUTOROLE] ${guild.name} sunucusunda "Rolleri Yönet" yetkim yok!`);
                    } else if (role.position >= botMember.roles.highest.position) {
                        console.error(`❌ [AUTOROLE] ${guild.name} sunucusunda ayarlı rol benim üzerimde! Veremiyorum.`);
                    } else {
                        member.roles.add(role)
                            .then(() => console.log(`✅ [AUTOROLE] ${member.user.tag} kullanıcısına ${role.name} rolü verildi.`))
                            .catch(err => {
                                console.error(`❌ [AUTOROLE] ${guild.name} sunucusunda rol verilirken hata:`, err.message);
                            });
                    }
                }
            }
        }

        // Standart Log Katılma (YENİ SİSTEM)
        try {
            await sendModLog({
                guildId: guild.id,
                type: 'memberJoin',
                userId: member.id,
                userTag: member.user.tag
            }, settings, client);
        } catch (e) {
            console.error("Join log hatası:", e);
        }

        let user = await User.findOne({ userId: member.id });
        if (!user) {
            user = await User.create({
                userId: member.id,
                tag: member.user.tag,
                avatar: member.user.avatar
            });
        }

        // --- HOŞGELDİN SİSTEMİ (CANVAS) ---
        if (settings.welcomeStatus && settings.welcomeChannel) {
            const channel = guild.channels.cache.get(settings.welcomeChannel);
            if (channel) {
                try {
                    const welcomeCard = await createWelcomeCard(member, 'WELCOME');
                    const attachment = new AttachmentBuilder(welcomeCard, { name: 'welcome.png' });

                    let msg = settings.welcomeMessage || 'Hoşgeldin {user}!';
                    msg = msg.replace('{user}', `<@${member.id}>`)
                        .replace('{tag}', member.user.tag)
                        .replace('{server}', guild.name)
                        .replace('{memberCount}', guild.memberCount);

                    await channel.send({ content: msg, files: [attachment] }).catch(() => { });
                    console.log(`✅ [WELCOME] ${member.user.tag} için hoşgeldin mesajı gönderildi.`);
                } catch (e) {
                    console.error("❌ [WELCOME] Canvas hatası:", e);
                }
            }
        }
    }
};

// Canvas Kartı Oluşturma (Gelişmiş Tasarım)
async function createWelcomeCard(member, type) {
    const { createCanvas, loadImage } = require('canvas');
    const canvas = createCanvas(1000, 500); // 1000x500
    const ctx = canvas.getContext('2d');

    const isWelcome = type === 'WELCOME';
    const primaryColor = isWelcome ? '#a855f7' : '#ef4444';
    const secondaryColor = isWelcome ? '#6366f1' : '#b91c1c';
    const accentColor = isWelcome ? '#ec4899' : '#f87171';

    // Deep Dark Background with Mesh Gradient
    const bgGrd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrd.addColorStop(0, '#0c0c14');
    bgGrd.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic Mesh Blobs
    const drawBlob = (x, y, radius, color, alpha = 0.3) => {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grd.addColorStop(0, color);
        grd.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    drawBlob(200, 100, 400, primaryColor, 0.4);
    drawBlob(800, 400, 500, secondaryColor, 0.4);
    drawBlob(500, 250, 300, accentColor, 0.2);

    // Decorative Geometric Patterns
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 150, canvas.height); ctx.stroke();
    }

    // Main Glass Panel
    const cardX = 40, cardY = 40, cardW = 920, cardH = 420;
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 40);
    ctx.fill();

    // Border for Glass Panel
    const borderGrd = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrd.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    borderGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    borderGrd.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.strokeStyle = borderGrd;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Stats Bar at Bottom
    const statsText = isWelcome
        ? `HOŞ GELDİN • SUNUCUDA ARTIK ${member.guild.memberCount} KİŞİYİZ`
        : `GÜLE GÜLE • SUNUCUDA KALAN ${member.guild.memberCount} KİŞİ`;

    ctx.fillStyle = primaryColor + '22';
    ctx.beginPath();
    ctx.roundRect(cardX + 410, cardH - 60, 470, 40, 12);
    ctx.fill();
    ctx.strokeStyle = primaryColor + '44';
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(statsText, cardX + 645, cardH - 33);

    // Avatar Section
    const centerX = 260, centerY = 250, radius = 135;

    // Outer Glow for Avatar
    const outerRadius = radius + 20;
    const glowGrd = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, outerRadius);
    glowGrd.addColorStop(0, primaryColor);
    glowGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrd;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;

    // Avatar Rings
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = primaryColor;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2); ctx.stroke();

    // Load Avatar
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 });
    let avatar;
    try { avatar = await loadImage(avatarURL); } catch (e) { avatar = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png'); }

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();

    // Text Content
    ctx.textAlign = 'left';

    // Title Text
    ctx.font = 'bold 75px sans-serif';
    const titleGrd = ctx.createLinearGradient(460, 0, 850, 0);
    titleGrd.addColorStop(0, '#ffffff');
    titleGrd.addColorStop(1, primaryColor);
    ctx.fillStyle = titleGrd;
    ctx.fillText(isWelcome ? 'HOŞ GELDİN' : 'GÜLE GÜLE', 460, 180);

    // Secondary Text (Username)
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(member.user.username.toUpperCase(), 460, 240);

    // Decorative Separator
    const sepGrd = ctx.createLinearGradient(460, 0, 700, 0);
    sepGrd.addColorStop(0, accentColor);
    sepGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = sepGrd;
    ctx.fillRect(460, 260, 400, 3);

    // Slogan Text
    ctx.font = '22px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const slogan = isWelcome
        ? "Seninle birlikte sunucumuz daha da güçlendi!"
        : "Aramızdan ayrılışın bizi üzdü, tekrar görüşmek üzere.";
    ctx.fillText(slogan, 460, 305);

    // Corner Accents
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = primaryColor;
    ctx.beginPath(); ctx.arc(cardX, cardY, 80, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;

    return canvas.toBuffer();
}

module.exports.createWelcomeCard = createWelcomeCard;
