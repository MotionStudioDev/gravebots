const { sendModLog } = require('../utils/modlog');
const Guild = require('../models/Guild');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage, client) {
        if (!oldMessage.guild || !oldMessage.author || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return; // Sadece içerik değişikliği

        const settings = await Guild.findOne({ guildId: oldMessage.guild.id });
        if (!settings) return;

        // Mod-Log gönder (yeni sistem)
        await sendModLog({
            guildId: oldMessage.guild.id,
            type: 'messageUpdate',
            userId: oldMessage.author.id,
            userTag: oldMessage.author.tag,
            channelId: oldMessage.channel.id,
            channelName: oldMessage.channel.name,
            oldContent: oldMessage.content || 'İçerik yok',
            newContent: newMessage.content || 'İçerik yok'
        }, settings, client);
    }
};