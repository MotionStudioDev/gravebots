const Guild = require('../models/Guild');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const settings = await Guild.findOne({ guildId: member.guild.id });
        if (!settings) return;

        // --- KORUMA SİSTEMLERİ ---

        // 1. Yasaklı Tag Kontrolü
        if (settings.protections?.bannedTags?.length > 0) {
            const hasBannedTag = settings.protections.bannedTags.some(tag => member.user.username.includes(tag));
            if (hasBannedTag) {
                try {
                    await member.send({ embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Yasaklı Tag!')
                            .setDescription(`Sunucumuzun yasaklı taglarından birini kullandığın için atıldın: **${member.guild.name}**`)
                    ]}).catch(() => {});
                    await member.kick('Yasaklı Tag Kullanımı');
                    return;
                } catch (e) { console.error(e); }
            }
        }

        // 2. Yaş Doğrulaması (Hesap Yaşı)
        if (settings.protections?.ageLimit > 0) {
            const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
            if (accountAge < settings.protections.ageLimit) {
                try {
                    await member.send({ embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Yeni Hesap Engeli!')
                            .setDescription(`Hesabın çok yeni olduğu için bu sunucuya katılamazsın. Gerekli yaş: **${settings.protections.ageLimit} gün**. Senin hesabın: **${Math.floor(accountAge)} gün**.`)
                    ]}).catch(() => {});
                    await member.kick('Hesap Yaşı Çok Küçük');
                    return;
                } catch (e) { console.error(e); }
            }
        }

        // 3. Bot Engel
        if (member.user.bot && settings.protections?.antiBot) {
            await member.kick('Anti-Bot Sistemi Aktif');
            return;
        }

        // --- NORMAL İŞLEMLER ---
        
        // 1. Otorol
        if (settings.autorole) {
            try {
                const role = member.guild.roles.cache.get(settings.autorole);
                if (role) await member.roles.add(role);
            } catch (e) { console.error('Otorol Hatası:', e); }
        }

        // 2. Hoş Geldin Mesajı (Embed)
        if (settings.welcomeChannel) {
            const channel = member.guild.channels.cache.get(settings.welcomeChannel);
            if (channel) {
                const msg = (settings.welcomeMessage || 'Hoşgeldin {user}, sunucumuza katıldı!')
                    .replace(/{user}/g, `<@${member.user.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('📥 Aramıza Yeni Biri Katıldı!')
                    .setDescription(msg)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: `${member.guild.name}`, iconURL: member.guild.iconURL() });

                channel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
};