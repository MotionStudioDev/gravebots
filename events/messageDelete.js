const { sendModLog } = require('../utils/modlog');
const Guild = require('../models/Guild');

module.exports = {
    name: 'messageDelete',
    async execute(message, client) {
        if (!message.guild || !message.author || message.author.bot) return;

        const settings = await Guild.findOne({ guildId: message.guild.id });
        if (!settings) return;

        // Mod-Log gönder (yeni sistem)
        await sendModLog({
            guildId: message.guild.id,
            type: 'messageDelete',
            userId: message.author.id,
            userTag: message.author.tag,
            channelId: message.channel.id,
            channelName: message.channel.name,
            content: message.content || 'İçerik yok (belki resim/embed)'
        }, settings, client);
    }
};