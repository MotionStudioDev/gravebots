const User = require('../models/User');
const Log = require('../models/Log');
const Guild = require('../models/Guild');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guild = member.guild;

        // --- DAVET TAKİP MANTIĞI ---
        const cachedInvites = client.invites.get(guild.id);
        const newInvites = await guild.invites.fetch().catch(() => null);

        let inviter = null;
        let usedInvite = null;

        if (cachedInvites && newInvites) {
            usedInvite = newInvites.find(inv => inv.uses > (cachedInvites.get(inv.code) || 0));
            if (usedInvite) {
                inviter = usedInvite.inviter;
                // Önbelleği güncelle
                client.invites.set(guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
            }
        }

        // MongoDB Ayarları
        const settings = await Guild.findOne({ guildId: guild.id });
        if (!settings?.inviteSystem?.status) return; // Sistem kapalıysa işlem yapma

        if (inviter) {
            // Davet edeni veritabanına kaydet/güncelle
            let inviterData = await User.findOne({ userId: inviter.id });
            if (!inviterData) inviterData = await User.create({ userId: inviter.id, tag: inviter.tag, avatar: inviter.displayAvatarURL() });

            inviterData.invites = (inviterData.invites || 0) + 1;
            await inviterData.save();

            // Davet kanalı ayarlıysa mesaj gönder
            if (settings.inviteSystem.channel) {
                const logChannel = guild.channels.cache.get(settings.inviteSystem.channel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setAuthor({ name: 'Üye Katıldı', iconURL: member.user.displayAvatarURL() })
                        .setDescription(`👋 <@${member.id}> sunucuya katıldı!\n\n**Davet Eden:** <@${inviter.id}> (${inviter.tag})\n**Davet Sayısı:** \`${inviterData.invites}\` davet\n**Davet Kodu:** \`${usedInvite.code}\``)
                        .setTimestamp()
                        .setFooter({ text: `ID: ${member.id}` });
                    logChannel.send({ embeds: [embed] }).catch(() => { });
                }
            }
            console.log(`📡 [INVITE] ${member.user.tag} katıldı. Davet eden: ${inviter.tag}`);
        }

        // Standart Log Katılma
        try {
            await Log.create({
                guildId: guild.id,
                type: 'memberJoin',
                userId: member.id,
                userTag: member.user.tag,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Join log hatası:", e);
        }

        let user = await User.findOne({ userId: member.id });
        if (!user) {
            await User.create({ userId: member.id, tag: member.user.tag, avatar: member.user.displayAvatarURL() });
        }
    }
};
