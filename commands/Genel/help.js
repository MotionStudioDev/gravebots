module.exports = {
    name: 'help',
    description: 'Tüm komutları listeler.',
    category: 'Genel',
    usage: 'help',
    async execute(message, args, client) {
        const { EmbedBuilder } = require('discord.js');
        const Guild = require('../../models/Guild');
        let settings = await Guild.findOne({ guildId: message.guild.id });
        const prefix = settings ? settings.prefix : 'g!';
        
        const categories = {};
        client.commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(`\`${cmd.name}\``);
        });

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📚 GraveBOT Komut Listesi')
            .setDescription(`Mevcut Prefix: \`${prefix}\`\nDetaylı yönetim için [Panel](http://localhost:3000) adresini ziyaret edebilirsiniz.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

        for (const category in categories) {
            embed.addFields({ name: category, value: categories[category].join(', '), inline: false });
        }

        message.reply({ embeds: [embed] });
    }
};