const ReactionRole = require('../models/ReactionRole');
const Giveaway = require('../models/Giveaway');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        if (user.bot) return;

        // Fetch partials
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Reaksiyon çekilirken hata oluştu:', error);
                return;
            }
        }
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (error) {
                console.error('Mesaj çekilirken hata oluştu:', error);
            }
        }

        // --- ÇEKİLİŞ KATILIMI ---
        // Emoji kontrolü (Hem karakter hem de unicode olarak)
        if (reaction.emoji.name === '🎉' || reaction.emoji.name === '\uD83C\uDF89') {
            const giveaway = await Giveaway.findOne({
                messageId: reaction.message.id,
                ended: false
            });

            if (giveaway) {
                if (!giveaway.participants.includes(user.id)) {
                    // Array update'i garantilemek için copy-and-push
                    const newParticipants = [...giveaway.participants, user.id];
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

                    console.log(`🎉 [BOT] ${user.tag} çekilişe katıldı: ${giveaway.prize} (Sunucu: ${reaction.message.guild.name})`);
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
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = guild.roles.cache.get(data.roleId);

            if (member && role) {
                try {
                    await member.roles.add(role);
                    console.log(`✅ [BOT] ${user.tag} için rol verildi: ${role.name}`);
                } catch (e) {
                    console.error('Emoji rol verme hatası:', e);
                }
            }
        }
    }
};