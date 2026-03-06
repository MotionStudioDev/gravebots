const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Infraction = require('../../models/Infraction');

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
            
            // Veritabanına Kaydet
            await Infraction.create({
                guildId: message.guild.id,
                userId: member.id,
                type: 'ban',
                reason: reason,
                moderatorId: message.author.id
            });

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 Kullanıcı Yasaklandı')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
                    { name: '🛡️ Yetkili', value: `${message.author.tag}`, inline: true },
                    { name: '📝 Sebep', value: reason, inline: false }
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