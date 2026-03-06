const Log = require('../models/Log');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        // Log Ayrılma
        try {
            await Log.create({
                guildId: member.guild.id,
                type: 'memberLeave',
                userId: member.id,
                userTag: member.user.tag,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Leave log hatası:", e);
        }
    }
};
