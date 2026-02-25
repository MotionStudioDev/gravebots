const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'user-info',
    description: 'Bir kullanıcının bilgilerini gösterir.',
    category: 'Sistem',
    usage: 'user-info [@kullanıcı]',
    async execute(message, args, client) {
        const member = message.mentions.members.first() || message.member;
        const user = member.user;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👤 Kullanıcı Bilgisi: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'ID', value: `\`${user.id}\``, inline: true },
                { name: 'Takma Ad', value: member.nickname || 'Yok', inline: true },
                { name: 'Hesap Oluşturma', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Sunucuya Katılma', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Roller', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`).join(', ') || 'Yok' }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};