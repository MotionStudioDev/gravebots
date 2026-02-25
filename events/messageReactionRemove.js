const ReactionRole = require('../models/ReactionRole');

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user, client) {
        if (user.bot) return;
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Reaksiyon çekilirken hata oluştu:', error);
                return;
            }
        }

        const data = await ReactionRole.findOne({
            guildId: reaction.message.guildId,
            messageId: reaction.message.id,
            emoji: reaction.emoji.name
        });

        if (data) {
            const guild = reaction.message.guild;
            const member = guild.members.cache.get(user.id);
            const role = guild.roles.cache.get(data.roleId);

            if (member && role) {
                try {
                    await member.roles.remove(role);
                } catch (e) {
                    console.error('Emoji rol geri alma hatası:', e);
                }
            }
        }
    }
};