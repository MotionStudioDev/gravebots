const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Kullanıcının avatarını gösterir.',
    category: 'Genel',
    usage: 'g!avatar [@kullanıcı]',
    aliases: ['pp', 'av'],
    async execute(message, args, client) {
    // 1. ŞABLON: Senin yükleme ekranın
    const loadingEmbed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription('⏳ Lütfen bekleyin, veriler analiz ediliyor...');

    const msg = await message.channel.send({ embeds: [loadingEmbed] });

    // Hedef kullanıcı tespiti
    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;
    let currentSize = 1024;

    const buildMarpelEmbed = (size) => {
        const avatarUrl = target.displayAvatarURL({ size: size, forceStatic: false });

        return new EmbedBuilder()
            .setColor('#2b2d31') // Marpel koyu gri tonu
            .setAuthor({ name: target.username, iconURL: avatarUrl })
            .setDescription(`**[Avatar Link](${avatarUrl})**`)
            .setImage(avatarUrl) // Boyut değiştikçe görsel gerçekten büyür/küçülür
            .setFooter({ text: `Sorgulayan: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });
    };

    const buildComponents = (selectedSize) => {
        // Kendi emoji ID'lerini buraya tanımladın
        const sizeOptions = [
            { label: 'Boyutuna Ayarla', value: '1024', emoji: '1456713855504875561' },
            { label: 'Boyutuna Ayarla', value: '512', emoji: '1456713507679764550' },
            { label: 'Boyutuna Ayarla', value: '256', emoji: '1456711996878618821' },
            { label: 'Boyutuna Ayarla', value: '128', emoji: '1456711400188674224' },
            { label: 'Boyutuna Ayarla', value: '64', emoji: '1456712525017256058' },
            { label: 'Boyutuna Ayarla', value: '32', emoji: '1456712294997299474' },
            { label: 'Boyutuna Ayarla', value: '16', emoji: '1456712832174395578' }
        ];

        const sizeMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('size_select')
                .setPlaceholder(`${selectedSize}`) // Marpel'deki gibi seçili boyut yazar
                .addOptions(sizeOptions.map(opt => ({
                    ...opt,
                    // Seçili olana mavi bir işaret eklemek istersen kullanabilirsin
                    default: parseInt(opt.value) === selectedSize 
                })))
        );

        return [sizeMenu];
    };

    // İlk Gönderim
    await msg.edit({ embeds: [buildMarpelEmbed(currentSize)], components: buildComponents(currentSize) });

    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === message.author.id, 
        time: 300000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'size_select') {
            currentSize = parseInt(i.values[0]);
            await i.update({ 
                embeds: [buildMarpelEmbed(currentSize)], 
                components: buildComponents(currentSize) 
            });
        }
    });

    collector.on('end', () => { msg.edit({ components: [] }).catch(() => {}); });
    }
};
