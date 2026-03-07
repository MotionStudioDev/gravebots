const Log = require('../models/Log');
const Guild = require('../models/Guild');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createWelcomeCard } = require('./guildMemberAdd');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const guild = member.guild;

        // Ayarları çek
        const settings = await Guild.findOne({ guildId: guild.id });

        // --- AYRILMA SİSTEMİ (CANVAS) ---
        if (settings?.leaveStatus && settings?.leaveChannel) {
            const channel = guild.channels.cache.get(settings.leaveChannel);
            if (channel) {
                try {
                    const leaveCard = await createWelcomeCard(member, 'LEAVE');
                    const attachment = new AttachmentBuilder(leaveCard, { name: 'leave.png' });

                    let msg = settings.leaveMessage || 'Güle Güle {tag}...';
                    msg = msg.replace('{user}', `<@${member.id}>`)
                        .replace('{tag}', member.user.tag)
                        .replace('{server}', guild.name)
                        .replace('{memberCount}', guild.memberCount);

                    await channel.send({ content: msg, files: [attachment] }).catch(() => { });
                } catch (e) {
                    console.error("❌ [LEAVE] Canvas hatası:", e);
                }
            }
        }

        // Log Ayrılma
        try {
            await Log.create({
                guildId: guild.id,
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
