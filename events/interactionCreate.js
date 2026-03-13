const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const Guild = require('../models/Guild');
const Survey = require('../models/Survey');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, botOwnerIds, addActivity) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, channel, message } = interaction;
        
        // --- ANKET SİSTEMİ ---
        if (customId.startsWith('survey_')) {
            await interaction.deferUpdate();
            
            const surveyIndex = parseInt(customId.split('_')[1]);
            const surveyData = await Survey.findOne({ messageId: message.id });
            
            if (!surveyData || surveyData.closed) return;

            // Kullanıcı daha önce oy vermiş mi?
            let alreadyVotedIndex = -1;
            surveyData.options.forEach((opt, idx) => {
                if (opt.votes.includes(user.id)) alreadyVotedIndex = idx;
            });

            if (alreadyVotedIndex === surveyIndex) {
                // Aynı şıkka tekrar basarsa oyunu geri çeksin
                surveyData.options[surveyIndex].votes = surveyData.options[surveyIndex].votes.filter(id => id !== user.id);
            } else {
                // Farklı şıkka basarsa eskisini sil, yenisini ekle
                if (alreadyVotedIndex !== -1) {
                    surveyData.options[alreadyVotedIndex].votes = surveyData.options[alreadyVotedIndex].votes.filter(id => id !== user.id);
                }
                surveyData.options[surveyIndex].votes.push(user.id);
            }

            await surveyData.save();

            // Embed'i güncelle
            const totalVotes = surveyData.options.reduce((acc, opt) => acc + opt.votes.length, 0);
            
            const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                .setDescription(`**${surveyData.question}**\n\n` + surveyData.options.map((opt, i) => {
                    const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                    const progressBar = '🟦'.repeat(Math.round(percentage / 10)) + '⬜'.repeat(10 - Math.round(percentage / 10));
                    return `${i + 1}️⃣ ${opt.label} (${opt.votes.length} oy - %${percentage})\n${progressBar}`;
                }).join('\n\n'));

            await message.edit({ embeds: [updatedEmbed] });
            return;
        }

        const settings = await Guild.findOne({ guildId: guild.id });

        if (customId === 'ticket_open') {
            await interaction.deferReply({ ephemeral: true });

            if (!settings?.ticketCategory) {
                return interaction.editReply('❌ Ticket kategorisi ayarlanmamış! Lütfen bir yetkiliye bildirin.');
            }

            const category = guild.channels.cache.get(settings.ticketCategory);
            if (!category) return interaction.editReply('❌ Ticket kategorisi bulunamadı! Lütfen bir yetkiliye bildirin.');

            // Botun kategori üzerinde yetkisi var mı kontrol edelim
            const botPermissions = category.permissionsFor(client.user);
            if (!botPermissions.has(PermissionsBitField.Flags.ManageChannels) || !botPermissions.has(PermissionsBitField.Flags.ViewChannel)) {
                return interaction.editReply('❌ Botun bu kategoride kanal oluşturma (Manage Channels) yetkisi yok! Lütfen yetkilerimi kontrol edin.');
            }

            // Kullanıcının halihazırda açık bir ticket'ı var mı kontrol edelim
            const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase()}` && c.parentId === category.id);
            if (existingChannel) {
                return interaction.editReply(`❌ Zaten açık bir destek talebiniz var: <#${existingChannel.id}>`);
            }

            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ]
                });

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎫 Destek Talebi Oluşturuldu')
                    .setDescription(`Merhaba <@${user.id}>, destek talebiniz başarıyla oluşturuldu. Yetkililer en kısa sürede sizinle ilgilenecektir.\n\nTicket'ı kapatmak için aşağıdaki butonu kullanabilirsiniz.`)
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Kapat')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ content: `<@${user.id}> & <@&${guild.roles.everyone.id}>`, embeds: [embed], components: [row] });
                await interaction.editReply(`✅ Destek talebiniz oluşturuldu: <#${ticketChannel.id}>`);

                if (addActivity) addActivity('add', 'Yeni Ticket Açıldı', `${user.tag} - #${ticketChannel.name}`, 'green', 'fa-ticket');

                // Log kanalına mesaj gönder
                if (settings.ticketLogChannel) {
                    const logChannel = guild.channels.cache.get(settings.ticketLogChannel);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('📥 Yeni Ticket')
                            .addFields(
                                { name: 'Kullanıcı', value: `<@${user.id}> (${user.id})`, inline: true },
                                { name: 'Kanal', value: `<#${ticketChannel.id}>`, inline: true }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }

            } catch (error) {
                console.error(error);
                await interaction.editReply('❌ Ticket kanalı oluşturulurken bir hata oluştu.');
            }
        }

        if (customId === 'ticket_close') {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔒 Ticket Kapatılıyor')
                .setDescription('Bu destek talebi 5 saniye içinde silinecektir.')
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            setTimeout(async () => {
                try {
                    await channel.delete();
                    if (addActivity) addActivity('remove', 'Ticket Kapatıldı', `#${channel.name}`, 'red', 'fa-lock');
                } catch (e) {
                    console.error('Ticket silme hatası:', e);
                }
            }, 5000);
        }
    }
};