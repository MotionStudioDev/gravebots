const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'koruma',
    description: 'Sunucu koruma sistemlerini yönetir.',
    category: 'Koruma',
    usage: 'koruma <sistem> <aç/kapat>',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const systems = {
            'küfür': 'antiSwear',
            'reklam': 'antiLink',
            'url': 'antiUrl',
            'emoji': 'antiEmoji',
            'spam': 'antiSpam',
            'caps': 'antiCaps',
            'bot': 'antiBot'
        };

        const target = args[0]?.toLowerCase();
        const action = args[1]?.toLowerCase();

        // Fonksiyon: Embed ve Butonları Oluştur
        const createProtectionPanel = async (guildId) => {
            const settings = await Guild.findOne({ guildId });
            const p = settings?.protections || {};
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🛡️ Sunucu Koruma Paneli')
                .setDescription('Komut Kullanımı: `g!koruma <sistem> <aç/kapat>`\n\n**Aşağıdaki butonları kullanarak tüm sistemleri tek tıkla yönetebilirsiniz.**')
                .addFields(
                    { name: '🤬 Küfür Engel', value: p.antiSwear ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '🔗 Reklam Engel', value: p.antiLink ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '🌐 URL Engel', value: p.antiUrl ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '😀 Emoji Engel', value: p.antiEmoji ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '⌨️ Caps Engel', value: p.antiCaps ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '⏳ Spam Engel', value: p.antiSpam ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '🤖 Bot Engel', value: p.antiBot ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: '🔞 Yaş Sınırı', value: `\`${p.ageLimit || 0}\` Gün`, inline: true }
                )
                .setFooter({ text: 'Ayarları Dashboard üzerinden de yönetebilirsiniz.' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('protections_all_on')
                        .setLabel('Tümünü Aç')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔓'),
                    new ButtonBuilder()
                        .setCustomId('protections_all_off')
                        .setLabel('Tümünü Kapat')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            return { embeds: [embed], components: [row] };
        };

        if (!target || !systems[target]) {
            const panel = await createProtectionPanel(message.guild.id);
            const response = await message.reply(panel);

            // Buton Kolektörü
            const collector = response.createMessageComponentCollector({ 
                filter: i => i.user.id === message.author.id, 
                time: 60000 
            });

            collector.on('collect', async i => {
                const status = i.customId === 'protections_all_on';
                
                // Mevcut durumu kontrol et
                const settings = await Guild.findOne({ guildId: message.guild.id });
                const p = settings?.protections || {};
                
                const allMatch = status ? 
                    (p.antiSwear && p.antiLink && p.antiUrl && p.antiEmoji && p.antiSpam && p.antiCaps && p.antiBot) : 
                    (!p.antiSwear && !p.antiLink && !p.antiUrl && !p.antiEmoji && !p.antiSpam && !p.antiCaps && !p.antiBot);

                if (allMatch) {
                    return i.reply({ 
                        content: `⚠️ Tüm koruma sistemleri zaten **${status ? 'AÇIK' : 'KAPALI'}** durumda!`, 
                        ephemeral: true 
                    });
                }
                
                await Guild.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { 
                        'protections.antiSwear': status,
                        'protections.antiLink': status,
                        'protections.antiUrl': status,
                        'protections.antiEmoji': status,
                        'protections.antiSpam': status,
                        'protections.antiCaps': status,
                        'protections.antiBot': status
                    },
                    { upsert: true }
                );

                const updatedPanel = await createProtectionPanel(message.guild.id);
                await i.update(updatedPanel);
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

            return;
        }

        if (action !== 'aç' && action !== 'kapat') {
            return message.reply('❌ Lütfen geçerli bir işlem belirtin: `aç` veya `kapat`');
        }

        const status = action === 'aç';
        const field = systems[target];

        await Guild.findOneAndUpdate(
            { guildId: message.guild.id },
            { [`protections.${field}`]: status },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor(status ? '#00FF00' : '#FF0000')
            .setTitle('✨ Koruma Güncellendi')
            .setDescription(`**${target.toUpperCase()}** koruması başarıyla **${action.toUpperCase()}** konuma getirildi.`)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};