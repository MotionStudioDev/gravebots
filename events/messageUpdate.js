const Log = require('../models/Log');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage, client) {
        if (!oldMessage.guild || !oldMessage.author || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return; // Sadece içerik değişikliği

        try {
            await Log.create({
                guildId: oldMessage.guild.id,
                type: 'messageUpdate',
                userId: oldMessage.author.id,
                userTag: oldMessage.author.tag,
                oldContent: oldMessage.content || 'İçerik yok',
                newContent: newMessage.content || 'İçerik yok',
                channelId: oldMessage.channel.id,
                channelName: oldMessage.channel.name,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Log kaydı oluşturulamadı:", e);
        }
    }
};
