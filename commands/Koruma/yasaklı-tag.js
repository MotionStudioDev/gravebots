const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'yasaklı-tag',
    description: 'Yasaklı tag listesini yönetir.',
    category: 'Koruma',
    usage: 'yasaklı-tag <ekle/çıkar/liste> [tag]',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const action = args[0]?.toLowerCase();
        const tag = args.slice(1).join(' ');

        let settings = await Guild.findOne({ guildId: message.guild.id });
        if (!settings) settings = await Guild.create({ guildId: message.guild.id });

        if (action === 'ekle') {
            if (!tag) return message.reply('❌ Lütfen eklemek istediğiniz tagı yazın.');
            if (settings.protections.bannedTags.includes(tag)) return message.reply('❌ Bu tag zaten yasaklı listesinde.');
            
            settings.protections.bannedTags.push(tag);
            await settings.save();
            return message.reply(`✅ **${tag}** başarıyla yasaklı taglar listesine eklendi.`);
        }

        if (action === 'çıkar' || action === 'sil') {
            if (!tag) return message.reply('❌ Lütfen listeden çıkarmak istediğiniz tagı yazın.');
            if (!settings.protections.bannedTags.includes(tag)) return message.reply('❌ Bu tag zaten yasaklı listesinde değil.');

            settings.protections.bannedTags = settings.protections.bannedTags.filter(t => t !== tag);
            await settings.save();
            return message.reply(`✅ **${tag}** başarıyla yasaklı taglar listesinden çıkarıldı.`);
        }

        // Liste
        const tags = settings.protections.bannedTags;
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🚫 Yasaklı Tag Listesi')
            .setDescription(tags.length > 0 ? tags.map(t => `\`${t}\``).join(', ') : 'Henüz yasaklı bir tag bulunmuyor.')
            .setFooter({ text: 'g!yasaklı-tag ekle/çıkar <tag>' });

        message.reply({ embeds: [embed] });
    }
};