const Guild = require('../models/Guild');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        const settings = await Guild.findOne({ guildId: member.guild.id });
        if (!settings || !settings.leaveChannel) return;

        const channel = member.guild.channels.cache.get(settings.leaveChannel);
        if (channel) {
            const msg = (settings.leaveMessage || 'Görüşürüz {user}, sunucumuzdan ayrıldı.')
                .replace(/{user}/g, `**${member.user.tag}**`)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('📤 Bir Üye Ayrıldı')
                .setDescription(msg)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: `${member.guild.name}`, iconURL: member.guild.iconURL() });

            channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
};