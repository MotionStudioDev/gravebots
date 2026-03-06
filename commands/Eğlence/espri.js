const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'espri',
    aliases: ['şaka'],
    description: 'Rastgele soğuk bir espri yapar.',
    category: 'Eğlence',
    usage: 'g!espri',
    async execute(message, args, client) {
        const espriler = [
            "Geçen gün bir taksi çevirdim, hala dönüyor.",
            "Adamın biri gülmüş, saksıya dikmişler.",
            "Sinemada on dakika ara dedi, aradım aradım açmadı.",
            "Röntgen filmi çektirdik, yakında vizyonda.",
            "Yıkanan tona ne denir? Washington.",
            "En acı on nedir? Biberon.",
            "Hangi padişah tahta çıkınca tahta kırılmış? II. Abdülhamit.",
            "Canı sıkılan kaplumbağa ne yapar? Kabuğuna çekilir.",
            "Küçük su birikintisine ne denir? Sucuk.",
            "Masada hangi örtü olmaz? Bitki örtüsü."
        ];

        const espri = espriler[Math.floor(Math.random() * espriler.length)];

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setTitle('🤣 Soğuk Espri')
            .setDescription(espri)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
