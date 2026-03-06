const Guild = require('../models/Guild');
const Afk = require('../models/Afk');
const Level = require('../models/Level');
const Blacklist = require('../models/Blacklist');
const CommandUsage = require('../models/CommandUsage');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// Basit Spam Kontrolü İçin Bellek
const spamMap = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client, botOwnerIds, addActivity) {
        if (!message.guild || message.author.bot) {
            return;
        }

        // --- GLOBAL BLACKLIST (KARA LİSTE) KONTROLÜ ---
        // 1. Sunucu Kara Listede mi?
        const isBlacklistedGuild = await Blacklist.findOne({ targetId: message.guild.id, type: 'guild' });
        if (isBlacklistedGuild) {
            console.log(`📡 [BLACKLIST] Engellenen sunucudan mesaj alındı (${message.guild.name}). Sunucudan çıkılıyor...`);
            await message.guild.leave().catch(() => { });
            return;
        }

        // 2. Kullanıcı Kara Listede mi?
        const isBlacklistedUser = await Blacklist.findOne({ targetId: message.author.id, type: 'user' });
        if (isBlacklistedUser && !botOwnerIds.includes(message.author.id)) {
            return; // Kara listedeki kullanıcı botu kullanamaz
        }

        // MongoDB'den ayarları al
        let settings = await Guild.findOne({ guildId: message.guild.id });
        if (!settings) settings = await Guild.create({ guildId: message.guild.id });

        // --- SA-AS SİSTEMİ ---
        if (settings.saas) {
            const saludos = ['sa', 'selam', 'selamun aleyküm', 'selamın aleyküm', 'sea', 's.a'];
            if (saludos.includes(message.content.toLowerCase().trim())) {
                message.reply('Aleyküm Selam, Hoşgeldin! 👋').catch(() => { });
            }
        }

        const isOwner = botOwnerIds.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // --- LEVEL SİSTEMİ (XP KAZANMA) ---
        if (settings.levelSystem?.status) {
            console.log(`[XP] Seviye sistemi aktif: ${message.author.tag} (ID: ${message.author.id})`);
            let userLevel = await Level.findOne({ guildId: message.guild.id, userId: message.author.id });
            if (!userLevel) {
                userLevel = new Level({
                    guildId: message.guild.id,
                    userId: message.author.id,
                    level: 1,
                    xp: 0,
                    lastMessage: new Date(0) // İlk mesajda XP alabilmesi için
                });
            }

            // XP Cooldown (Bot sahibi için cooldown yok, üyeler için 5 saniye)
            const now = Date.now();
            const lastMsg = userLevel.lastMessage ? new Date(userLevel.lastMessage).getTime() : 0;
            const diff = now - lastMsg;
            const cooldown = isOwner ? 0 : 5000;

            if (diff > cooldown) {
                const xpGain = (Math.floor(Math.random() * 10) + 15) * (settings.levelSystem.xpRate || 1);
                userLevel.xp += xpGain;
                userLevel.lastMessage = now;
                console.log(`[XP] ${message.author.tag} için XP eklendi: +${xpGain} (Toplam: ${userLevel.xp})`);

                // Level Up Kontrolü (Gelişmiş)
                let nextLevelXP = userLevel.level * userLevel.level * 100;

                while (userLevel.xp >= nextLevelXP) {
                    userLevel.xp -= nextLevelXP; // XP'yi sıfırlamak yerine kalanı tutalım
                    userLevel.level += 1;
                    nextLevelXP = userLevel.level * userLevel.level * 100;
                    // console.log(`SEVİYE ATLADI! Yeni Seviye: ${userLevel.level}`);

                    const levelUpEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🎉 Seviye Atladın!')
                        .setDescription(`Tebrikler <@${message.author.id}>! **${userLevel.level}.** seviyeye ulaştın!`)
                        .setThumbnail(message.author.displayAvatarURL())
                        .setTimestamp();

                    const logChannelId = settings.levelSystem.channel;
                    const logChannel = logChannelId ? message.guild.channels.cache.get(logChannelId) : message.channel;

                    if (logChannel) {
                        logChannel.send({ embeds: [levelUpEmbed] }).catch(() => { });
                    }
                }

                await userLevel.save().catch(err => console.error("XP Kayıt Hatası:", err));
                console.log(`[XP] XP Eklendi: ${message.author.tag} -> +${xpGain} XP (Yeni Toplam: ${userLevel.xp})`);
            } else {
                // console.log(`[XP] ${message.author.tag} için cooldown aktif. Kalan: ${5000 - diff}ms`);
            }
        }

        // --- AFK KONTROLÜ ---
        // 1. AFK olan birinden bahsedildi mi?
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async (user) => {
                const afkData = await Afk.findOne({ userId: user.id, guildId: message.guild.id });
                if (afkData) {
                    const duration = Math.floor((Date.now() - afkData.timestamp) / 1000);
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    const timeStr = minutes > 0 ? `${minutes} dakika, ${seconds} saniye` : `${seconds} saniye`;

                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setDescription(`👤 **${user.tag}** şu an AFK.\n\n**Sebep:** ${afkData.reason}\n**Süre:** ${timeStr} önce AFK oldu.`);

                    message.reply({ embeds: [embed] }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                }
            });
        }

        // 2. Mesajı yazan kişi AFK mıydı? (AFK'dan Çıkar)
        const userAfk = await Afk.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (userAfk && !message.content.startsWith(settings.prefix || 'g!')) {
            const duration = Math.floor((Date.now() - userAfk.timestamp) / 1000);
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;

            let timeStr = "";
            if (hours > 0) timeStr += `${hours} saat `;
            if (minutes > 0) timeStr += `${minutes} dakika `;
            timeStr += `${seconds} saniye`;

            await Afk.deleteOne({ userId: message.author.id, guildId: message.guild.id });

            // İsmini eski haline getirme (Opsiyonel)
            if (message.member.manageable && message.member.displayName.startsWith('[AFK]')) {
                const newNick = message.member.displayName.replace('[AFK] ', '');
                message.member.setNickname(newNick).catch(() => { });
            }

            message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF00')
                        .setDescription(`👋 Hoş geldin <@${message.author.id}>! Tekrar mesaj yazdığın için AFK modun kapatıldı.\n\n**Süre:** ${timeStr} boyunca AFK kaldın.`)
                ]
            }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 10000));
        }

        // --- KORUMA SİSTEMLERİ (Admin ve Sahip Muaf) ---
        if (!isOwner && !isAdmin) {
            // 1. Küfür Engel
            if (settings.protections?.antiSwear) {
                const badWords = [
                    'amk', 'aq', 'sik', 'piç', 'göt', 'oç', 'yarrak', 'amcık', 'meme', 'taşak', 'kahpe', 'fahişe', 'it', 'köpek', 'şerefsiz', 'haysiyetsiz', 'namussuz', 'evveliyatını', 'gelmişini', 'geçmişini', 'bacını', 'karını', 'karısı', 'bacısı', 'gavat', 'pezevenk', 'pic', 'sikik', 'siktir', 'sikerim', 'siktiğim', 'sokuk', 'amına', 'aminakoyim', 'aminakoim', 'amkoyim', 'orospu', 'orospi', 'orosbu', 'mal', 'gerizekalı', 'aptal', 'salak', 'şerefsiz', 'pust', 'puşt', 'yavşak', 'yawsak', 'veled', 'velet'
                ];

                const contentLower = message.content.toLowerCase();
                const hasBadWord = badWords.some(word => {
                    const regex = new RegExp(`(\\b|\\W)${word}(\\b|\\W)`, 'i');
                    return regex.test(contentLower) || contentLower.includes(word);
                });

                if (hasBadWord) {
                    await message.delete().catch(() => { });

                    // Mod-Log Gönder
                    if (settings.logs?.moderation) {
                        const logChannel = message.guild.channels.cache.get(settings.logs.moderation) || await message.guild.channels.fetch(settings.logs.moderation).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🔞 Küfür Filtresi')
                                .addFields(
                                    { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Mesaj İçeriği', value: `\`\`\`${message.content.substring(0, 500)}\`\`\`` }
                                )
                                .setTimestamp();
                            logChannel.send({ embeds: [logEmbed] }).catch(err => console.error("Log gönderme hatası:", err));
                        }
                    }

                    return message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`⚠️ <@${message.author.id}>, bu sunucuda küfür kullanımı yasaktır!`)
                        ]
                    }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                }
            }

            // 2. Reklam/Link/URL Engel
            if (settings.protections?.antiLink || settings.protections?.antiUrl) {
                const linkPattern = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/g;
                const generalLinkPattern = /(https?:\/\/[^\s]+)/g;

                let isLink = linkPattern.test(message.content);
                let isGeneralUrl = generalLinkPattern.test(message.content);

                // Sadece Discord Davet Linki Korunuyorsa
                if (settings.protections?.antiLink && isLink) {
                    await message.delete().catch(() => { });

                    // Mod-Log Gönder
                    if (settings.logs?.moderation) {
                        const logChannel = message.guild.channels.cache.get(settings.logs.moderation);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🔗 Reklam Filtresi')
                                .addFields(
                                    { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Mesaj İçeriği', value: `\`\`\`${message.content.substring(0, 500)}\`\`\`` }
                                )
                                .setTimestamp();
                            logChannel.send({ embeds: [logEmbed] }).catch(() => { });
                        }
                    }

                    return message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`⚠️ <@${message.author.id}>, bu sunucuda reklam paylaşımı yasaktır!`)
                        ]
                    }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                }

                // Genel URL Korunuyorsa
                if (settings.protections?.antiUrl && isGeneralUrl) {
                    await message.delete().catch(() => { });

                    // Mod-Log Gönder
                    if (settings.logs?.moderation) {
                        const logChannel = message.guild.channels.cache.get(settings.logs.moderation);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🌐 URL Filtresi')
                                .addFields(
                                    { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Mesaj İçeriği', value: `\`\`\`${message.content.substring(0, 500)}\`\`\`` }
                                )
                                .setTimestamp();
                            logChannel.send({ embeds: [logEmbed] }).catch(() => { });
                        }
                    }

                    return message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`⚠️ <@${message.author.id}>, bu sunucuda URL paylaşımı yasaktır!`)
                        ]
                    }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                }
            }

            // 3. Caps Engel
            if (settings.protections?.antiCaps) {
                const capsCount = (message.content.match(/[A-Z]/g) || []).length;
                if (message.content.length > 5 && (capsCount / message.content.length) > 0.7) {
                    await message.delete().catch(() => { });
                    return message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`⚠️ <@${message.author.id}>, lütfen aşırı büyük harf kullanma!`)
                        ]
                    }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                }
            }

            // 4. Spam Engel
            if (settings.protections?.antiSpam) {
                const now = Date.now();
                const userData = spamMap.get(message.author.id) || { count: 0, lastMessage: 0 };

                if (now - userData.lastMessage < 2000) { // 2 saniye içinde
                    userData.count++;
                } else {
                    userData.count = 1;
                }
                userData.lastMessage = now;
                spamMap.set(message.author.id, userData);

                if (userData.count > 5) { // 5 mesaj sınırı
                    await message.delete().catch(() => { });
                    if (userData.count === 6) {
                        return message.channel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setDescription(`⚠️ <@${message.author.id}>, çok hızlı mesaj gönderiyorsun! Spam yapma.`)
                            ]
                        }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                    }
                    return;
                }
            }

            // 5. Emoji Engel
            if (settings.protections?.antiEmoji) {
                const emojiRegex = /<a?:.+?:\d+>|[\u{1f300}-\u{1f5ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{1f700}-\u{1f77f}\u{1f780}-\u{1f7ff}\u{1f900}-\u{1f9ff}\u{1fa00}-\u{1faff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu;
                const emojiCount = (message.content.match(emojiRegex) || []).length;

                if (emojiCount > 5) { // 5'ten fazla emoji varsa
                    await message.delete().catch(() => { });

                    // Mod-Log Gönder
                    if (settings.logs?.moderation) {
                        const logChannel = message.guild.channels.cache.get(settings.logs.moderation) || await message.guild.channels.fetch(settings.logs.moderation).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('😀 Emoji Filtresi')
                                .addFields(
                                    { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                    { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
                                    { name: 'Emoji Sayısı', value: `${emojiCount}`, inline: true }
                                )
                                .setTimestamp();
                            logChannel.send({ embeds: [logEmbed] }).catch(() => { });
                        }
                    }

                    return message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`⚠️ <@${message.author.id}>, lütfen aşırı emoji kullanma! (Maks: 5)`)
                        ]
                    }).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
                }
            }
        }

        const prefix = settings.prefix || 'g!';

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        // Bakım Modu Kontrolü
        if (global.maintenanceMode && !isOwner) {
            const maintenanceEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🛠️ Bakım Modu Aktif')
                .setDescription('Botumuz şu anda sizlere daha iyi hizmet verebilmek için bakıma alınmıştır.')
                .addFields(
                    { name: 'Neden?', value: 'Yeni özellikler ekleniyor veya sistem iyileştirmeleri yapılıyor.' },
                    { name: 'Ne Zaman Biter?', value: 'En kısa sürede tekrar aktif olacağız. Anlayışınız için teşekkürler!' }
                )
                .setTimestamp()
                .setFooter({ text: 'GraveBOT Yönetim Paneli', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [maintenanceEmbed] });
        }

        // Komut Yasaklama Kontrolü
        if (settings.disabledCommands.includes(command.name)) {
            return message.reply(`❌ **${command.name}** komutu bu sunucuda devre dışı bırakılmış.`);
        }

        // Ekonomi Sistemi Kontrolü
        if (command.category === 'Ekonomi' && !settings.economy?.status && !isOwner) {
            return message.reply('❌ Bu sunucuda ekonomi sistemi devre dışı bırakılmış.');
        }

        try {
            await command.execute(message, args, client, addActivity);
            
            // Komut kullanımını kaydet
            await CommandUsage.create({
                commandName: command.name,
                category: command.category || 'Genel',
                userId: message.author.id,
                guildId: message.guild.id
            });
        } catch (error) {
            console.error(error);
            message.reply('❌ Bu komutu çalıştırırken bir hata oluştu!');
        }
    }
};