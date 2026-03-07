const ReactionRole = require('../models/ReactionRole');
const Giveaway = require('../models/Giveaway');
const { EmbedBuilder } = require('discord.js');

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

        // --- ÇEKİLİŞ ÇIKIŞI ---
        if (reaction.emoji.name === '🎉' || reaction.emoji.name === '\uD83C\uDF89') {
            const giveaway = await Giveaway.findOne({
                messageId: reaction.message.id,
                ended: false
            });

            if (giveaway) {
                if (giveaway.participants.includes(user.id)) {
                    // Kullanıcıyı katılımcılardan çıkar
                    const newParticipants = giveaway.participants.filter(id => id !== user.id);
                    giveaway.participants = newParticipants;
                    await giveaway.save();

                    // Embed'i güncelle - katılımcı sayısını göster
                    try {
                        const embed = reaction.message.embeds[0];
                        if (embed) {
                            const updatedEmbed = new EmbedBuilder(embed)
                                .setDescription(
                                    embed.description.replace(
                                        /\*\*Katılımcılar:\*\* \d+/,
                                        `**Katılımcılar:** ${newParticipants.length}`
                                    )
                                );
                            await reaction.message.edit({ embeds: [updatedEmbed] });
                        }
                    } catch (updateError) {
                        console.error('Çekiliş embed güncellenirken hata:', updateError);
                    }

                    console.log(`🎉 [BOT] ${user.tag} çekilişten çıktı: ${giveaway.prize} (Sunucu: ${reaction.message.guild.name})`);
                }
                return; // Çekilişse başka kontrol yapma
            }
        }

        // --- EMOJİ ROL ---

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