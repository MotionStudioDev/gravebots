const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Kullanıcının susturmasını kaldırır.',
    category: 'Moderasyon',
    usage: 'unmute @kullanıcı',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Üyeleri Sustur` yetkiniz yok.')] });
        }

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Lütfen susturması kaldırılacak bir üye etiketleyin.');

        try {
            await member.timeout(null);
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Susturma Kaldırıldı')
                .setDescription(`${member.user.tag} kullanıcısının susturması başarıyla kaldırıldı.`)
                .setTimestamp();

            message.reply({ embeds: [embed] });
            if (addActivity) addActivity('unmute', 'Susturma Kaldırıldı', `${member.user.tag}`, 'green', 'fa-microphone');
        } catch (e) {
            console.error(e);
            message.reply('❌ Susturma kaldırılırken bir hata oluştu.');
        }
    }
};