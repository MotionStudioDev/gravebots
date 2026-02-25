const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Botun gecikmesini gösterir.',
    category: 'Genel',
    usage: 'ping',
    async execute(message, args, client) {
        const sent = await message.reply({ embeds: [
            new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription('🏓 Ölçülüyor...')
        ]});
        
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Gecikme', value: `\`${latency}ms\``, inline: true },
                { name: 'API Gecikmesi', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setTimestamp();

        sent.edit({ embeds: [embed] });
    }
};