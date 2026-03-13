const { EmbedBuilder } = require('discord.js');
const Log = require('../models/Log');

/**
 * Gelişmiş Mod-Log gönderme fonksiyonu
 * @param {Object} options - Log seçenekleri
 * @param {string} options.guildId - Sunucu ID
 * @param {string} options.type - Log tipi ('messageDelete', 'messageUpdate', 'memberJoin', 'memberLeave', 'ban', 'kick', 'mute', 'warn', 'protection')
 * @param {string} options.userId - Kullanıcı ID
 * @param {string} options.userTag - Kullanıcı etiketi
 * @param {string} options.channelId - Kanal ID (opsiyonel)
 * @param {string} options.channelName - Kanal adı (opsiyonel)
 * @param {string} options.content - Mesaj içeriği (opsiyonel)
 * @param {string} options.oldContent - Eski içerik (opsiyonel)
 * @param {string} options.newContent - Yeni içerik (opsiyonel)
 * @param {string} options.reason - Sebep (opsiyonel)
 * @param {string} options.moderatorId - Moderatör ID (opsiyonel)
 * @param {string} options.moderatorTag - Moderatör etiketi (opsiyonel)
 * @param {Object} settings - Guild ayarları
 * @param {Object} client - Discord.js Client nesnesi
 * @returns {Promise<boolean>} - Log gönderme başarılı mı
 */
async function sendModLog(options, settings, client) {
    try {
        // Mod-Log kanalı ayarlanmış mı kontrol et
        if (!settings?.logs?.moderation) {
            console.log(`[MOD-LOG] ${options.guildId} sunucusunda mod-log kanalı ayarlanmamış.`);
            return false;
        }

        if (!client) {
            console.error(`[MOD-LOG] Client nesnesi bulunamadı!`);
            return false;
        }

        const guild = await client.guilds.fetch(options.guildId).catch(() => null);
        if (!guild) {
            console.log(`[MOD-LOG] ${options.guildId} sunucusu bulunamadı.`);
            return false;
        }

        const channel = await guild.channels.fetch(settings.logs.moderation).catch(() => null);
        if (!channel) {
            console.log(`[MOD-LOG] ${settings.logs.moderation} kanalı bulunamadı.`);
            return false;
        }

        // Veritabanına kaydet
        await Log.create({
            guildId: options.guildId,
            type: options.type,
            userId: options.userId,
            userTag: options.userTag,
            channelId: options.channelId,
            channelName: options.channelName,
            content: options.content,
            oldContent: options.oldContent,
            newContent: options.newContent,
            timestamp: new Date()
        });

        // Embed oluştur
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: 'GraveBOT Mod-Log Sistemi' });

        // Log tipine göre embed ayarla
        switch (options.type) {
            case 'messageDelete':
                embed
                    .setColor('#FF0000')
                    .setTitle('🗑️ Mesaj Silindi')
                    .setDescription(`Bir mesaj <#${options.channelId}> kanalında silindi.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Kanal', value: `<#${options.channelId}>`, inline: true },
                        { name: 'İçerik', value: options.content ? `\`\`\`${options.content.substring(0, 1000)}\`\`\`` : '*İçerik bulunamadı*' }
                    );
                break;

            case 'messageUpdate':
                embed
                    .setColor('#FFA500')
                    .setTitle('✏️ Mesaj Düzenlendi')
                    .setDescription(`Bir mesaj <#${options.channelId}> kanalında düzenlendi.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Kanal', value: `<#${options.channelId}>`, inline: true },
                        { name: 'Eski İçerik', value: options.oldContent ? `\`\`\`${options.oldContent.substring(0, 500)}\`\`\`` : '*İçerik bulunamadı*' },
                        { name: 'Yeni İçerik', value: options.newContent ? `\`\`\`${options.newContent.substring(0, 500)}\`\`\`` : '*İçerik bulunamadı*' }
                    );
                break;

            case 'memberJoin':
                embed
                    .setColor('#00FF00')
                    .setTitle('👋 Üye Katıldı')
                    .setDescription(`Yeni bir üye sunucuya katıldı.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Hesap Oluşturma', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(`https://cdn.discordapp.com/avatars/${options.userId}/${options.userTag.split('#')[1]}.png`);
                break;

            case 'memberLeave':
                embed
                    .setColor('#FF6B6B')
                    .setTitle('👋 Üye Ayrıldı')
                    .setDescription(`Bir üye sunucudan ayrıldı.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `${options.userTag}`, inline: true },
                        { name: 'ID', value: options.userId, inline: true }
                    );
                break;

            case 'ban':
                embed
                    .setColor('#DC143C')
                    .setTitle('🔨 Ban İşlemi')
                    .setDescription(`Bir kullanıcı banlandı.`)
                    .addFields(
                        { name: 'Banlanan', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Sebep', value: options.reason || 'Sebep belirtilmedi', inline: true },
                        { name: 'Moderatör', value: options.moderatorId ? `<@${options.moderatorId}> (${options.moderatorTag})` : 'Bilinmiyor', inline: true }
                    );
                break;

            case 'kick':
                embed
                    .setColor('#FF8C00')
                    .setTitle('🚪 Kick İşlemi')
                    .setDescription(`Bir kullanıcı atıldı.`)
                    .addFields(
                        { name: 'Atılan', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Sebep', value: options.reason || 'Sebep belirtilmedi', inline: true },
                        { name: 'Moderatör', value: options.moderatorId ? `<@${options.moderatorId}> (${options.moderatorTag})` : 'Bilinmiyor', inline: true }
                    );
                break;

            case 'mute':
                embed
                    .setColor('#FFD700')
                    .setTitle('🔇 Mute İşlemi')
                    .setDescription(`Bir kullanıcı susturuldu.`)
                    .addFields(
                        { name: 'Susturulan', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Sebep', value: options.reason || 'Sebep belirtilmedi', inline: true },
                        { name: 'Moderatör', value: options.moderatorId ? `<@${options.moderatorId}> (${options.moderatorTag})` : 'Bilinmiyor', inline: true }
                    );
                break;

            case 'warn':
                embed
                    .setColor('#FFA500')
                    .setTitle('⚠️ Uyarı İşlemi')
                    .setDescription(`Bir kullanıcı uyarıldı.`)
                    .addFields(
                        { name: 'Uyarılan', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Sebep', value: options.reason || 'Sebep belirtilmedi', inline: true },
                        { name: 'Moderatör', value: options.moderatorId ? `<@${options.moderatorId}> (${options.moderatorTag})` : 'Bilinmiyor', inline: true }
                    );
                break;

            case 'protection':
                embed
                    .setColor('#FF4500')
                    .setTitle('🛡️ Koruma Sistemi')
                    .setDescription(`Koruma filtresi devreye girdi.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Kanal', value: `<#${options.channelId}>`, inline: true },
                        { name: 'Tür', value: options.reason || 'Koruma filtresi', inline: true },
                        { name: 'İçerik', value: options.content ? `\`\`\`${options.content.substring(0, 500)}\`\`\`` : '*İçerik bulunamadı*' }
                    );
                break;

            default:
                embed
                    .setColor('#5865F2')
                    .setTitle('📋 Sistem Logu')
                    .setDescription(`Bir sistem olayı gerçekleşti.`)
                    .addFields(
                        { name: 'Kullanıcı', value: `<@${options.userId}> (${options.userTag})`, inline: true },
                        { name: 'Tür', value: options.type, inline: true }
                    );
                if (options.content) {
                    embed.addFields({ name: 'İçerik', value: `\`\`\`${options.content}\`\`\`` });
                }
        }

        // Embed'i gönder
        await channel.send({ embeds: [embed] });
        console.log(`[MOD-LOG] ${options.type} logu gönderildi: ${options.guildId}`);
        return true;

    } catch (error) {
        console.error(`[MOD-LOG] Hata:`, error);
        return false;
    }
}

module.exports = { sendModLog };