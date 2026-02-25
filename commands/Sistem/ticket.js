const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'ticket',
    description: 'Ticket sistemini kurar.',
    category: 'Sistem',
    usage: 'ticket <kur/kategori/log/mesaj>',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action) {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎫 Ticket Sistemi')
                .setDescription('Ticket sistemini yönetmek için aşağıdaki komutları kullanın:')
                .addFields(
                    { name: '`g!ticket kur`', value: 'Ticket açma butonunu bulunduğunuz kanala gönderir.', inline: true },
                    { name: '`g!ticket kategori <ID>`', value: 'Ticket kanallarının açılacağı kategoriyi belirler.', inline: true },
                    { name: '`g!ticket log <#kanal>`', value: 'Ticket loglarının gönderileceği kanalı belirler.', inline: true }
                )
                .setFooter({ text: 'Ayarlar Dashboard üzerinden de yönetilebilir.' });
            return message.reply({ embeds: [embed] });
        }

        if (action === 'kur') {
            const settings = await Guild.findOne({ guildId: message.guild.id });
            if (!settings?.ticketCategory) {
                return message.reply('❌ Önce bir kategori ID\'si belirlemelisiniz! Kullanım: `g!ticket kategori <ID>`');
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎫 Destek Talebi')
                .setDescription(settings?.ticketMessage || 'Bir sorun yaşıyorsanız veya yardıma ihtiyacınız varsa aşağıdaki butona tıklayarak bir destek talebi açabilirsiniz.')
                .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_open')
                    .setLabel('Ticket Aç')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Primary)
            );

            await message.channel.send({ embeds: [embed], components: [row] });
            return message.reply('✅ Ticket açma mesajı başarıyla gönderildi.');
        }

        if (action === 'kategori') {
            const categoryId = args[1];
            if (!categoryId) return message.reply('❌ Lütfen bir kategori ID\'si girin.');
            const category = message.guild.channels.cache.get(categoryId);
            if (!category || category.type !== 4) return message.reply('❌ Geçersiz kategori ID\'si.');

            await Guild.findOneAndUpdate({ guildId: message.guild.id }, { ticketCategory: categoryId }, { upsert: true });
            return message.reply(`✅ Ticket kategorisi başarıyla ayarlandı: **${category.name}**`);
        }

        if (action === 'log') {
            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
            if (!channel || channel.type !== 0) return message.reply('❌ Lütfen geçerli bir metin kanalı etiketleyin.');

            await Guild.findOneAndUpdate({ guildId: message.guild.id }, { ticketLogChannel: channel.id }, { upsert: true });
            return message.reply(`✅ Ticket log kanalı başarıyla ayarlandı: <#${channel.id}>`);
        }
    }
};