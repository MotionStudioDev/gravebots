const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ReactionRole = require('../../models/ReactionRole');

module.exports = {
    name: 'emoji-rol',
    description: 'Emojiye tıklayarak rol alma sistemini kurar.',
    category: 'Sistem',
    usage: 'emoji-rol <#kanal> <mesajId> <emoji> <@rol>',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const channel = message.mentions.channels.first();
        const messageId = args[1];
        const emoji = args[2];
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[3]);

        if (!channel || !messageId || !emoji || !role) {
            return message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎭 Emoji Rol Sistemi')
                    .setDescription('Kullanım: `g!emoji-rol <#kanal> <mesajId> <emoji> <@rol>`\n\n**Not:** Belirlediğiniz mesaj o kanalda mevcut olmalı ve botun o mesaja tepki ekleme yetkisi olmalıdır.')
                    .setFooter({ text: 'Dashboard üzerinden de yönetebilirsiniz.' })
            ]});
        }

        try {
            const targetChannel = client.channels.cache.get(channel.id);
            const targetMessage = await targetChannel.messages.fetch(messageId);
            
            await targetMessage.react(emoji);

            await ReactionRole.create({
                guildId: message.guild.id,
                messageId: messageId,
                channelId: channel.id,
                emoji: emoji,
                roleId: role.id
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Emoji Rol Başarıyla Kuruldu')
                .addFields(
                    { name: 'Kanal', value: `<#${channel.id}>`, inline: true },
                    { name: 'Emoji', value: emoji, inline: true },
                    { name: 'Rol', value: `<@&${role.id}>`, inline: true }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            message.reply('❌ Bir hata oluştu. Mesaj ID\'sinin doğruluğunu ve botun yetkilerini kontrol edin.');
        }
    }
};