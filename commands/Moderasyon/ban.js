const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Kullanıcıyı sunucudan yasaklar.',
    category: 'Moderasyon',
    usage: 'ban @kullanıcı [sebep]',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Üyeleri Yasakla` yetkiniz yok.')
            ]});
        }

        const member = message.mentions.members.first();
        if (!member) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Lütfen yasaklanacak bir üye etiketleyin.')
            ]});
        }

        if (!member.bannable) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu kullanıcıyı yasaklayamıyorum. Yetkim yetmiyor olabilir.')
            ]});
        }

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
        
        try {
            await member.ban({ reason });
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔨 Kullanıcı Yasaklandı')
                .addFields(
                    { name: 'Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: 'Yetkili', value: `${message.author.tag}`, inline: true },
                    { name: 'Sebep', value: reason }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
            if (addActivity) addActivity('ban', 'Kullanıcı Yasaklandı', `${member.user.tag} - ${message.guild.name}`, 'red', 'fa-user-slash');
        } catch (e) {
            console.error(e);
            message.reply('❌ Kullanıcı yasaklanırken bir hata oluştu.');
        }
    }
};