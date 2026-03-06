const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    name: 'cüzdan',
    aliases: ['wallet', 'para'],
    description: 'Cüzdanınızdaki ve bankanızdaki parayı gösterir.',
    category: 'Ekonomi',
    usage: 'g!cüzdan [@kullanıcı]',
    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        let user = await User.findOne({ userId: target.id });
        if (!user) user = await User.create({ userId: target.id });

        const embed = new EmbedBuilder()
            .setColor('Gold')
            .setTitle(`💰 ${target.username} Bakiyesi`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '💵 Cüzdan', value: `\`${user.money} 💸\``, inline: true },
                { name: '🏦 Banka', value: `\`${user.bank} 💸\``, inline: true },
                { name: '📊 Toplam', value: `\`${user.money + user.bank} 💸\``, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
