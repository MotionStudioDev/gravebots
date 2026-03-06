const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'transfer',
    aliases: ['pay', 'gönder'],
    description: 'Başka bir kullanıcıya para gönderir.',
    category: 'Ekonomi',
    usage: 'g!transfer @kullanıcı <miktar>',
    async execute(message, args, client) {
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply('❌ Lütfen para göndermek istediğiniz birini etiketleyin!');
        if (target.bot) return message.reply('❌ Botlara para gönderemezsiniz!');
        if (target.id === message.author.id) return message.reply('❌ Kendinize para gönderemezsiniz!');
        if (!amount || amount <= 0) return message.reply('❌ Lütfen geçerli bir miktar girin!');

        let sender = await User.findOne({ userId: message.author.id });
        if (!sender || sender.money < amount) return message.reply('❌ Cüzdanınızda bu kadar para yok!');

        let receiver = await User.findOne({ userId: target.id });
        if (!receiver) receiver = await User.create({ userId: target.id });

        sender.money -= amount;
        receiver.money += amount;

        await sender.save();
        await receiver.save();

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('💸 Para Transferi')
            .setDescription(`**${message.author.username}**, **${target.username}** adlı kullanıcıya **${amount} 💸** gönderdi!`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
