const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'görüşürüz',
    description: 'Ayrılan üyeler için görüşürüz mesajı sistemini yönetir.',
    category: 'Sistem',
    usage: 'görüşürüz <#kanal/kapat/mesaj> [yeni mesaj]',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const action = args[0]?.toLowerCase();

        if (!action) {
            let settings = await Guild.findOne({ guildId: message.guild.id });
            const channel = settings?.leaveChannel ? `<#${settings.leaveChannel}>` : '`Kapalı`';
            const leaveMsg = settings?.leaveMessage || 'Görüşürüz {user}, sunucumuzdan ayrıldı.';
            
            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('📤 Görüşürüz Ayarları')
                .addFields(
                    { name: 'Kanal', value: channel, inline: true },
                    { name: 'Mesaj', value: `\`${leaveMsg}\``, inline: false },
                    { name: 'Değişkenler', value: '`{user}`, `{server}`, `{memberCount}`', inline: false }
                )
                .setFooter({ text: 'Kullanım: g!görüşürüz #kanal | g!görüşürüz mesaj <metin> | g!görüşürüz kapat' });

            return message.reply({ embeds: [embed] });
        }

        if (action === 'kapat') {
            await Guild.findOneAndUpdate({ guildId: message.guild.id }, { leaveChannel: null }, { upsert: true });
            return message.reply('✅ Görüşürüz mesajı sistemi kapatıldı.');
        }

        if (action === 'mesaj') {
            const newMsg = args.slice(1).join(' ');
            if (!newMsg) return message.reply('❌ Lütfen yeni bir görüşürüz mesajı yazın.');
            
            await Guild.findOneAndUpdate({ guildId: message.guild.id }, { leaveMessage: newMsg }, { upsert: true });
            return message.reply(`✅ Görüşürüz mesajı güncellendi: \`${newMsg}\``);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(action);
        if (!channel || channel.type !== 0) return message.reply('❌ Lütfen geçerli bir metin kanalı etiketleyin veya ID girin.');

        await Guild.findOneAndUpdate({ guildId: message.guild.id }, { leaveChannel: channel.id }, { upsert: true });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Görüşürüz Kanalı Ayarlandı')
            .setDescription(`Ayrılan üyeler için mesajlar artık <#${channel.id}> kanalına gönderilecek.`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};