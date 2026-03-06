const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Infraction = require('../../models/Infraction');

module.exports = {
    name: 'warn',
    aliases: ['uyar'],
    description: 'Kullanıcıyı uyarır.',
    category: 'Moderasyon',
    usage: 'warn @kullanıcı [sebep]',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Mesajları Yönet` yetkiniz yok.')
            ]});
        }

        const member = message.mentions.members.first();
        if (!member) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Lütfen uyarılacak bir üye etiketleyin.')
            ]});
        }

        if (member.id === message.author.id) return message.reply('❌ Kendini uyaramazsın!');
        if (member.user.bot) return message.reply('❌ Botları uyaramazsın!');

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

        try {
            await Infraction.create({
                guildId: message.guild.id,
                userId: member.id,
                type: 'warn',
                reason: reason,
                moderatorId: message.author.id
            });

            const warns = await Infraction.countDocuments({ guildId: message.guild.id, userId: member.id, type: 'warn' });

            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('⚠️ Kullanıcı Uyarıldı')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
                    { name: '🛡️ Yetkili', value: `${message.author.tag}`, inline: true },
                    { name: '📊 Toplam Uyarı', value: `\`${warns}\``, inline: true },
                    { name: '📝 Sebep', value: reason, inline: false }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
            
            // Kullanıcıya DM gönder
            member.send({ embeds: [
                new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setTitle(`⚠️ ${message.guild.name} Sunucusunda Uyarıldınız`)
                    .addFields(
                        { name: 'Sebep', value: reason },
                        { name: 'Yetkili', value: message.author.tag }
                    )
                    .setTimestamp()
            ]}).catch(() => {});

            if (addActivity) addActivity('warn', 'Kullanıcı Uyarıldı', `${member.user.tag} - ${message.guild.id}`, 'yellow', 'fa-triangle-exclamation');
        } catch (e) {
            console.error(e);
            message.reply('❌ Kullanıcı uyarılırken bir hata oluştu.');
        }
    }
};
