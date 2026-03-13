const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Survey = require('../../models/Survey');

module.exports = {
    name: 'anket',
    description: 'Yeni bir anket başlatır.',
    usage: 'anket <soru> | <seçenek1> | <seçenek2> | ...',
    category: 'Sistem',
    permissions: [PermissionFlagsBits.ManageMessages],
    async execute(message, args, client, botOwnerIds, settings) {
        const prefix = settings?.prefix || 'g!';
        if (!args.length) {
            return message.reply(`Lütfen bir soru ve seçenekler girin. Örn: \`${prefix}anket Hangi oyun? | Valorant | CS:GO\``);
        }

        const input = args.join(' ').split('|').map(s => s.trim());
        const question = input[0];
        const options = input.slice(1);

        if (!question) return message.reply('Lütfen bir soru belirtin.');
        if (options.length < 2) return message.reply('En az 2 seçenek belirtmelisiniz.');
        if (options.length > 5) return message.reply('En fazla 5 seçenek belirleyebilirsiniz.');

        const embed = new EmbedBuilder()
            .setTitle('📊 Yeni Anket!')
            .setDescription(`**${question}**\n\n` + options.map((opt, i) => `${i + 1}️⃣ ${opt} (0 oy)`).join('\n'))
            .setColor('Blue')
            .setFooter({ text: `${message.author.tag} tarafından başlatıldı.`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder();
        options.forEach((opt, i) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`survey_${i}`)
                    .setLabel(opt)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const surveyMsg = await message.channel.send({ embeds: [embed], components: [row] });

        // Save to DB
        const newSurvey = new Survey({
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: surveyMsg.id,
            question: question,
            options: options.map(opt => ({ label: opt, votes: [] })),
            creatorId: message.author.id
        });

        await newSurvey.save();
    }
};
