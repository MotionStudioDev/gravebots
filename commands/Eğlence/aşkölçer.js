const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'aşk-ölçer',
    aliases: ['ask', 'love'],
    description: 'Etiketlediğin kişiyle arandaki aşkı ölçer.',
    category: 'Eğlence',
    usage: 'g!aşk-ölçer @kullanıcı',
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Lütfen aşkını ölçeceğin birini etiketle!');
        if (target.id === message.author.id) return message.reply('❌ Kendini o kadar çok mu seviyorsun? :D');

        const love = Math.floor(Math.random() * 100);
        let heart = '';
        if (love < 20) heart = '💔';
        else if (love < 50) heart = '🧡';
        else if (love < 80) heart = '💖';
        else heart = '❤️🔥';

        const embed = new EmbedBuilder()
            .setColor('Pink')
            .setTitle('💘 Aşk Ölçer')
            .setDescription(`**${message.author.username}** ❤️ **${target.username}**\n\n**Aşk Yüzdesi:** %${love} ${heart}`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
