const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'mute',
    description: 'Kullanıcıyı süreli olarak susturur (Timeout).',
    category: 'Moderasyon',
    usage: 'mute @kullanıcı <süre: 1m, 1h, 1d> [sebep]',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Üyeleri Sustur` yetkiniz yok.')] });
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Lütfen susturulacak bir üye etiketleyin.');

        const durationStr = args[1];
        if (!durationStr) return message.reply('❌ Lütfen bir süre belirtin (Örn: 10m, 1h, 1d).');

        let durationMs = 0;
        const timeValue = parseInt(durationStr);
        if (durationStr.endsWith('m')) durationMs = timeValue * 60 * 1000;
        else if (durationStr.endsWith('h')) durationMs = timeValue * 60 * 60 * 1000;
        else if (durationStr.endsWith('d')) durationMs = timeValue * 24 * 60 * 60 * 1000;
        else return message.reply('❌ Geçersiz süre formatı! Kullanım: `10m` (dakika), `1h` (saat), `1d` (gün).');

        if (durationMs > 2419200000) return message.reply('❌ Bir kullanıcı en fazla 28 gün susturulabilir.');

        const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';

        try {
            await member.timeout(durationMs, reason);
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔇 Kullanıcı Susturuldu')
                .addFields(
                    { name: 'Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: 'Süre', value: `${durationStr}`, inline: true },
                    { name: 'Sebep', value: reason }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
            if (addActivity) addActivity('mute', 'Kullanıcı Susturuldu', `${member.user.tag} - ${durationStr}`, 'orange', 'fa-microphone-slash');
        } catch (e) {
            console.error(e);
            message.reply('❌ Kullanıcı susturulurken bir hata oluştu.');
        }
    }
};