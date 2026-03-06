const Log = require('../models/Log');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        if (!message.guild || message.author.bot) return;

        try {
            await Log.create({
                guildId: message.guild.id,
                type: 'messageDelete',
                userId: message.author.id,
                userTag: message.author.tag,
                content: message.content || 'İçerik yok (belki resim/embed)',
                channelId: message.channel.id,
                channelName: message.channel.name,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Log kaydı oluşturulamadı:", e);
        }
    }
};
