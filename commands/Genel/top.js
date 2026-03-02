const { EmbedBuilder } = require('discord.js');
const Level = require('../../models/Level');

module.exports = {
    name: 'top',
    description: 'Sunucu seviye sıralamasını gösterir.',
    category: 'Genel',
    usage: 'g!top',
    async execute(message, args, client) {
        const topUsers = await Level.find({ guildId: message.guild.id })
            .sort({ level: -1, xp: -1 })
            .limit(10);

        if (topUsers.length === 0) {
            return message.reply('❌ Henüz bu sunucuda seviye kasan kimse yok.');
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🏆 ${message.guild.name} Seviye Sıralaması`)
            .setThumbnail(message.guild.iconURL())
            .setTimestamp();

        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const user = await client.users.fetch(topUsers[i].userId).catch(() => null);
            const userTag = user ? user.tag : 'Bilinmeyen Kullanıcı';
            description += `**${i + 1}.** ${userTag} - Seviye: \`${topUsers[i].level}\` (XP: \`${topUsers[i].xp}\`)\n`;
        }

        embed.setDescription(description);
        message.reply({ embeds: [embed] });
    }
};
