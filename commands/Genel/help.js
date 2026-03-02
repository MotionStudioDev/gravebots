const { EmbedBuilder } = require('discord.js');
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
                    { name: '🔀 Takma Adlar', value: command.aliases ? command.aliases.map(a => `\`${a}\``).join(', ') : 'Yok.', inline: true }
                )
                .setFooter({ text: 'Parantez içindeki kısımlar isteğe bağlıdır.' })
                .setTimestamp();

            return message.reply({ embeds: [cmdEmbed] });
        }

        // Genel yardım listesi
        const categories = {};
        client.commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(`\`${cmd.name}\``);
        });

        const helpEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📚 GraveBOT Yardım Merkezi')
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setDescription(`Aşağıda kategorilere ayrılmış tüm komutlarımı görebilirsin.\nBelirli bir komut hakkında detaylı bilgi için: \`${prefix}yardım [komut]\` yazabilirsin.`)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '✨ Toplam Komut', value: `\`${client.commands.size}\``, inline: true },
                { name: '🌐 Dashboard', value: '[Buraya Tıkla](http://localhost:3000)', inline: true },
                { name: '❓ Nasıl Kullanılır?', value: `Komutları kullanmak için başına \`${prefix}\` koymalısın.`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `${message.author.tag} tarafından istendi.`, iconURL: message.author.displayAvatarURL() });

        for (const category in categories) {
            helpEmbed.addFields({ 
                name: `📂 ${category}`, 
                value: categories[category].join(', '), 
                inline: false 
            });
        }

        message.reply({ embeds: [helpEmbed] });
    }
};
