const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    name: 'günlük',
    aliases: ['daily'],
    description: 'Günlük paranızı almanızı sağlar.',
    category: 'Ekonomi',
    usage: 'g!günlük',
    async execute(message, args, client) {
        let user = await User.findOne({ userId: message.author.id });
        if (!user) user = await User.create({ userId: message.author.id });

        const cooldown = 24 * 60 * 60 * 1000; // 24 saat
        const lastDaily = user.lastDaily;

        if (lastDaily !== null && cooldown - (Date.now() - lastDaily) > 0) {
            const time = cooldown - (Date.now() - lastDaily);
            const hours = Math.floor(time / (60 * 60 * 1000));
            const minutes = Math.floor((time % (60 * 60 * 1000)) / (60 * 1000));
            return message.reply(`❌ Günlük ödülünü zaten aldın! Tekrar alabilmek için **${hours} saat ${minutes} dakika** beklemelisin.`);
        }

        const amount = Math.floor(Math.random() * 500) + 500;
        user.money += amount;
        user.lastDaily = Date.now();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('💰 Günlük Ödül')
            .setDescription(`Tebrikler! Günlük ödülün olan **${amount} 💸** cüzdanına eklendi.`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
