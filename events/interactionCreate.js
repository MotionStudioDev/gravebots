const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, botOwnerIds, addActivity) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, channel } = interaction;
        const settings = await Guild.findOne({ guildId: guild.id });

        if (customId === 'ticket_open') {
            await interaction.deferReply({ ephemeral: true });

            if (!settings?.ticketCategory) {
                return interaction.editReply('❌ Ticket kategorisi ayarlanmamış! Lütfen bir yetkiliye bildirin.');
            }

            const category = guild.channels.cache.get(settings.ticketCategory);
            if (!category) return interaction.editReply('❌ Ticket kategorisi bulunamadı! Lütfen bir yetkiliye bildirin.');

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