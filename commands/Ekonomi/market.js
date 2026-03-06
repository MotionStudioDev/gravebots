const { EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'market',
    aliases: ['shop', 'mağaza'],
    description: 'Sunucudaki market ürünlerini listeler.',
    category: 'Ekonomi',
    usage: 'market',
    async execute(message, args, client) {
        const settings = await Guild.findOne({ guildId: message.guild.id });
        if (!settings || !settings.shop || settings.shop.length === 0) {
            return message.reply('❌ Bu sunucunun marketinde henüz bir ürün bulunmuyor.');
        }

        const embed = new EmbedBuilder()
            .setColor('Gold')
            .setTitle(`🛒 ${message.guild.name} Marketi`)
            .setThumbnail(message.guild.iconURL())
            .setDescription('Satın almak için: `g!satınal <ürün_adı>`')
            .setTimestamp();

        settings.shop.forEach(item => {
            embed.addFields({ 
                name: `📦 ${item.name}`, 
                value: `**Fiyat:** ${item.price} ${settings.economy?.currency || '💸'}\n**Açıklama:** ${item.description || 'Yok'}`, 
                inline: false 
            });
        });

        message.reply({ embeds: [embed] });
    }
};
