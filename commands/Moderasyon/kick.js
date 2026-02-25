const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'kick',
    description: 'Kullanıcıyı sunucudan atar.',
    category: 'Moderasyon',
    usage: 'kick @kullanıcı [sebep]',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Üyeleri At` yetkiniz yok.')
            ]});
        }

        const member = message.mentions.members.first();
        if (!member) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Lütfen atılacak bir üye etiketleyin.')
            ]});
        }

        if (!member.kickable) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu kullanıcıyı sunucudan atamıyorum. Yetkim yetmiyor olabilir.')
            ]});
        }

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
        
        try {
            await member.kick(reason);
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('👢 Kullanıcı Atıldı')
                .addFields(
                    { name: 'Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: 'Yetkili', value: `${message.author.tag}`, inline: true },
                    { name: 'Sebep', value: reason }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
            if (addActivity) addActivity('kick', 'Kullanıcı Atıldı', `${member.user.tag} - ${message.guild.name}`, 'orange', 'fa-user-xmark');
        } catch (e) {
            console.error(e);
            message.reply('❌ Kullanıcı atılırken bir hata oluştu.');
        }
    }
};