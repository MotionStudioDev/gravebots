const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'hoşgeldin',
    description: 'Yeni gelen üyeler için hoşgeldin mesajı sistemini yönetir.',
    category: 'Sistem',
    usage: 'hoşgeldin <#kanal/kapat/mesaj> [yeni mesaj]',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const action = args[0]?.toLowerCase();

        if (!action) {
            let settings = await Guild.findOne({ guildId: message.guild.id });
            const channel = settings?.welcomeChannel ? `<#${settings.welcomeChannel}>` : '`Kapalı`';
            const welcomeMsg = settings?.welcomeMessage || 'Hoşgeldin {user}, sunucumuza katıldı!';
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📥 Hoşgeldin Ayarları')
                .addFields(
                    { name: 'Kanal', value: channel, inline: true },
                    { name: 'Mesaj', value: `\`${welcomeMsg}\``, inline: false },
                    { name: 'Değişkenler', value: '`{user}`, `{server}`, `{memberCount}`', inline: false }
                )
                .setFooter({ text: 'Kullanım: g!hoşgeldin #kanal | g!hoşgeldin mesaj <metin> | g!hoşgeldin kapat' });

            return message.reply({ embeds: [embed] });
        }

        if (action === 'kapat') {
            await Guild.findOneAndUpdate({ guildId: message.guild.id }, { welcomeChannel: null }, { upsert: true });
            return message.reply('✅ Hoşgeldin mesajı sistemi kapatıldı.');
        }

        if (action === 'mesaj') {
            const newMsg = args.slice(1).join(' ');
            if (!newMsg) return message.reply('❌ Lütfen yeni bir hoşgeldin mesajı yazın.');
            
            await Guild.findOneAndUpdate({ guildId: message.guild.id }, { welcomeMessage: newMsg }, { upsert: true });
            return message.reply(`✅ Hoşgeldin mesajı güncellendi: \`${newMsg}\``);
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(action);
        if (!channel || channel.type !== 0) return message.reply('❌ Lütfen geçerli bir metin kanalı etiketleyin veya ID girin.');

        await Guild.findOneAndUpdate({ guildId: message.guild.id }, { welcomeChannel: channel.id }, { upsert: true });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Hoşgeldin Kanalı Ayarlandı')
            .setDescription(`Yeni gelen üyeler için mesajlar artık <#${channel.id}> kanalına gönderilecek.`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};