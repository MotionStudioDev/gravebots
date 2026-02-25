const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'server-info',
    description: 'Sunucu hakkında detaylı bilgi verir.',
    category: 'Sistem',
    usage: 'server-info',
    async execute(message, args, client) {
        const guild = message.guild;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🏰 Sunucu Bilgisi: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Kurucu', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Kuruluş Tarihi', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: 'Üye Sayısı', value: `\`${guild.memberCount}\``, inline: true },
                { name: 'Kanal Sayısı', value: `\`${guild.channels.cache.size}\``, inline: true },
                { name: 'Rol Sayısı', value: `\`${guild.roles.cache.size}\``, inline: true },
                { name: 'Boost Seviyesi', value: `\`${guild.premiumTier}\` (${guild.premiumSubscriptionCount} Boost)`, inline: true }
            )
            .setFooter({ text: `ID: ${guild.id}` })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};