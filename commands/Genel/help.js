const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'yardım',
    aliases: ['help', 'yardim'],
    description: 'Tüm komutları listeler veya belirli bir komut hakkında bilgi verir.',
    category: 'Genel',
    usage: 'g!yardım [komut]',
    async execute(message, args, client) {
        const settings = await Guild.findOne({ guildId: message.guild.id });
        const prefix = settings ? settings.prefix : 'g!';

        // Belirli bir komut yardımı istenmiş mi?
        if (args[0]) {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) {
                return message.reply({
                    embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ **${commandName}** adında bir komut bulamadım.`)]
                });
            }

            const cmdEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🛠️ Komut Bilgisi: ${command.name}`)
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    { name: '📝 Açıklama', value: command.description || 'Açıklama yok.', inline: false },
                    { name: '📁 Kategori', value: command.category || 'Genel', inline: true },
                    { name: '⌨️ Kullanım', value: `\`${command.usage || prefix + command.name}\``, inline: true },
                    { name: '🔀 Takma Adlar', value: command.aliases && command.aliases.length > 0 ? command.aliases.map(a => `\`${a}\``).join(', ') : 'Yok.', inline: true }
                )
                .setFooter({ text: 'Parantez içindeki kısımlar isteğe bağlıdır.' })
                .setTimestamp();

            return message.reply({ embeds: [cmdEmbed] });
        }

        // Genel yardım listesi hazırlığı
        const categories = {};
        const categoryIcons = {
            'Genel': '🌏',
            'Ekonomi': '💰',
            'Eğlence': '🎭',
            'Koruma': '🛡️',
            'Moderasyon': '🔨',
            'Müzik': '🎵',
            'Sistem': '⚙️'
        };

        client.commands.forEach(cmd => {
            const cat = cmd.category || 'Genel';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const categoryNames = Object.keys(categories);

        const initialEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📚 GraveBOT Yardım Merkezi`)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(
                `Selam <@${message.author.id}>! Aşağıdaki menüden bir kategori seçerek komutlarımı inceleyebilirsin.\n\n` +
                `✨ **Toplam Komut:** \`${client.commands.size}\` adet\n` +
                `⌨️ **Prefix:** \`${prefix}\` (Bu sunucuda)\n\n` +
                `💡 *Kategoriler arasında geçiş yapmak için aşağıdaki menüyü kullan!*`
            )
            .addFields(
                { name: '🔗 Hızlı Linkler', value: `[Botu Ekle](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands) | [Web Panel](http://localhost:3000) | [Destek Sunucusu](https://discord.gg/gravebot)` }
            )
            .setFooter({ text: `${message.author.tag} tarafından istendi.`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        // Butonlar
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Botu Ekle!')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
            new ButtonBuilder()
                .setLabel('Web Panel')
                .setStyle(ButtonStyle.Link)
                .setURL('https://l24.im/35lT8W'),
            new ButtonBuilder()
                .setLabel('Destek Al')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/gravebot')
        );

        // Seçim Menüsü
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_menu')
                .setPlaceholder('📂 Bir kategori seçin...')
                .addOptions(
                    { label: 'Anasayfa', value: 'home', description: 'Yardım merkezi ana sayfasına dön.', emoji: '🏠' },
                    ...categoryNames.map(cat => ({
                        label: cat,
                        value: cat,
                        description: `${cat} kategorisindeki komutları gör.`,
                        emoji: categoryIcons[cat] || '📁'
                    }))
                )
        );

        const helpMsg = await message.reply({ embeds: [initialEmbed], components: [menu, buttons] });

        // Collector Kurulumu
        const filter = i => i.user.id === message.author.id;
        const collector = helpMsg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'help_menu') {
                const selected = i.values[0];

                if (selected === 'home') {
                    await i.update({ embeds: [initialEmbed], components: [menu, buttons] });
                } else {
                    const cmds = categories[selected];
                    const catEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle(`${categoryIcons[selected] || '📁'} ${selected} Komutları`)
                        .setDescription(`Aşağıda **${selected}** kategorisindeki tüm komutlar listelenmiştir.\nDetaylı bilgi için: \`${prefix}yardım [komut]\``)
                        .setThumbnail(client.user.displayAvatarURL())
                        .addFields(
                            {
                                name: 'Komutlar',
                                value: cmds.map(c => `\`${c.name}\``).join(', ') || 'Bu kategoride komut bulunmuyor.'
                            }
                        )
                        .setTimestamp()
                        .setFooter({ text: `${message.author.tag} tarafından istendi.`, iconURL: message.author.displayAvatarURL() });

                    await i.update({ embeds: [catEmbed], components: [menu, buttons] });
                }
            }
        });

        collector.on('end', () => {
            // Süre dolduğunda menüyü devre dışı bırak
            const disabledMenu = new ActionRowBuilder().addComponents(
                StringSelectMenuBuilder.from(menu.components[0]).setDisabled(true)
            );
            helpMsg.edit({ components: [disabledMenu, buttons] }).catch(() => { });
        });
    }
};

