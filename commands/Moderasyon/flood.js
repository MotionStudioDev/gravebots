const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Flood = require('../../models/Flood');
const { loadConfig, saveConfig } = require('../../configs/flood-config');

module.exports = {
    name: 'flood',
    description: 'Flood sistemi yönetimi',
    usage: 'flood [ayarla|sıfırla|durumu|yapılandır]',
    category: 'Moderasyon',
    async execute(message, args, client, addActivity) {
        // Yetki Kontrolü
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Bu komutu kullanmak için `Mesajları Yönet` yetkisine sahip olmalısınız.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (!subcommand) {
            const config = loadConfig();
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🛡️ Flood Sistemi')
                .setDescription('Sunucunuzun flood durumunu yönetin.')
                .addFields(
                    { name: '📊 Durumu', value: config.enabled ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '⚡ Mesaj Limiti', value: `${config.messageLimit} mesaj / ${config.messageTimeframe / 1000}s`, inline: true },
                    { name: '🎮 Komut Limiti', value: `${config.commandLimit} komut / ${config.commandTimeframe / 1000}s`, inline: true },
                    { name: '\u200B', value: '\u200B' },
                    { name: '⚠️ Uyarı', value: `${config.punishments.warn} ihlal`, inline: true },
                    { name: '🔇 Mute', value: `${config.punishments.mute} ihlal (${config.muteDuration / 60000} dk)`, inline: true },
                    { name: '🚪 Kick', value: `${config.punishments.kick} ihlal`, inline: true },
                    { name: '🔨 Ban', value: `${config.punishments.ban} ihlal`, inline: true }
                );
            return message.reply({ embeds: [embed] });
        }

        // --- SIFIRLA ---
        if (subcommand === 'sifirla') {
            const user = message.mentions.users.first();
            if (!user) return message.reply('❌ Bir kullanıcı etiketleyin!');

            await Flood.findOneAndUpdate(
                { guildId: message.guild.id, userId: user.id },
                { violations: 0, isMuted: false, muteEndsAt: null }
            );

            addActivity('shield', `${user.tag} flood kaydı sıfırlandı`, message.guild.name, 'blue', 'fa-shield');
            return message.reply(`✅ ${user.tag} için flood kaydı sıfırlandı!`);
        }

        // --- DURUMU GÖSTER ---
        if (subcommand === 'durumu') {
            const user = message.mentions.users.first();
            if (!user) return message.reply('❌ Bir kullanıcı etiketleyin!');

            const floodData = await Flood.findOne({ guildId: message.guild.id, userId: user.id });
            if (!floodData) {
                return message.reply(`✅ ${user.tag} flood kaydı yok.`);
            }

            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle(`📊 ${user.tag} - Flood Durumu`)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: '📈 İhlal Sayısı', value: floodData.violations.toString(), inline: true },
                    { name: '💬 Mesaj Sayısı', value: floodData.messageCount.toString(), inline: true },
                    { name: '🎮 Komut Sayısı', value: floodData.commandCount.toString(), inline: true },
                    { name: '\u200B', value: '\u200B' },
                    { name: '⚡ Muted', value: floodData.isMuted ? '✅ Evet' : '❌ Hayır', inline: true },
                    { name: '⚖️ Ceza', value: floodData.punishmentType.toUpperCase(), inline: true },
                    { name: '📅 Tarih', value: `<t:${Math.floor(floodData.createdAt / 1000)}:f>`, inline: true }
                );

            return message.reply({ embeds: [embed] });
        }

        // --- YAPIKLANDIRMA ---
        if (subcommand === 'yapılandır') {
            const config = loadConfig();
            const subsub = args[1]?.toLowerCase();

            if (subsub === 'aktifleştir') {
                config.enabled = true;
                saveConfig(config);
                return message.reply('✅ Flood sistemi aktifleştirildi!');
            }

            if (subsub === 'deaktifleştir') {
                config.enabled = false;
                saveConfig(config);
                return message.reply('✅ Flood sistemi deaktifleştirildi!');
            }

            if (subsub === 'mesajlimit') {
                const newLimit = parseInt(args[2]);
                config.messageLimit = newLimit;
                saveConfig(config);
                return message.reply(`✅ Mesaj limiti ${newLimit} olarak ayarlandı!`);
            }

            if (subsub === 'komutlimit') {
                const newLimit = parseInt(args[2]);
                config.commandLimit = newLimit;
                saveConfig(config);
                return message.reply(`✅ Komut limiti ${newLimit} olarak ayarlandı!`);
            }

            if (subsub === 'logkanal') {
                const channel = message.mentions.channels.first();
                if (!channel) return message.reply('❌ Bir kanal etiketleyin!');

                config.logChannel = channel.id;
                saveConfig(config);
                return message.reply(`✅ Log kanalı ${channel} olarak ayarlandı!`);
            }

            return message.reply('❌ Geçersiz ayarlanmış alt komut!');
        }

        return message.reply('❌ Geçersiz alt komut! Seçenekler: sıfırla, durumu, yapılandır');
    }
};
