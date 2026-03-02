const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'mod-log',
    description: 'Mod-Log kanalını ayarlar.',
    category: 'Sistem',
    usage: 'g!mod-log #kanal veya g!mod-log kapat',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın.');
            return message.reply({ embeds: [embed] });
        }

        const settings = await Guild.findOne({ guildId: message.guild.id });
        const channel = message.mentions.channels.first();
        const action = args[0]?.toLowerCase();

        // Kapatma/Sıfırlama İşlemi
        if (action === 'kapat' || action === 'sıfırla') {
            if (!settings?.logs?.moderation) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setDescription('⚠️ Mod-Log zaten kapalı durumda.');
                return message.reply({ embeds: [embed] });
            }

            await Guild.findOneAndUpdate(
                { guildId: message.guild.id },
                { $set: { 'logs.moderation': null } },
                { upsert: true }
            );

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Mod-Log Sıfırlandı')
                .setDescription('Mod-Log kanalı başarıyla sıfırlandı ve sistem devre dışı bırakıldı.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        // Kanal Ayarlama İşlemi
        if (!channel) {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('ℹ️ Mod-Log Kullanımı')
                .setDescription('Lütfen bir kanal etiketleyin veya sistemi kapatmak için `kapat` yazın.')
                .addFields({ name: 'Örnek Kullanım', value: '`g!mod-log #log-kanalı`\n`g!mod-log kapat`' })
                .setFooter({ text: 'GraveBOT Yönetim Sistemi' });
            return message.reply({ embeds: [embed] });
        }

        if (channel.type !== 0) { // 0 = GuildText
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ Lütfen geçerli bir **metin kanalı** etiketleyin.');
            return message.reply({ embeds: [embed] });
        }

        // Dashboard/Komut ile zaten aktifse uyarı ver
        if (settings?.logs?.moderation === channel.id) {
            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('⚠️ Zaten Aktif')
                .setDescription(`Mod-Log sistemi zaten <#${channel.id}> kanalında aktif durumda!`)
                .setFooter({ text: 'Aynı kanalı tekrar ayarlayamazsınız.' });
            return message.reply({ embeds: [embed] });
        }

        await Guild.findOneAndUpdate(
            { guildId: message.guild.id },
            { $set: { 'logs.moderation': channel.id } },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Mod-Log Ayarlandı')
            .setThumbnail(message.guild.iconURL())
            .setDescription(`Mod-Log kanalı başarıyla <#${channel.id}> olarak ayarlandı.`)
            .addFields(
                { name: 'Ayarlayan Yetkili', value: `${message.author.tag}`, inline: true },
                { name: 'Kanal', value: `<#${channel.id}>`, inline: true }
            )
            .setFooter({ text: 'GraveBOT Koruma Sistemi' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
