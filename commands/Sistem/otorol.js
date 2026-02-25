const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'otorol',
    description: 'Yeni gelen üyelere otomatik rol verilmesini sağlar.',
    category: 'Sistem',
    usage: 'otorol <@rol/kapat>',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const action = args[0];

        if (!action) {
            let settings = await Guild.findOne({ guildId: message.guild.id });
            const currentRole = settings?.autorole ? `<@&${settings.autorole}>` : '`Kapalı`';
            return message.reply(`ℹ️ Şu anki otorol: ${currentRole}\nKullanım: \`g!otorol @rol\` veya \`g!otorol kapat\``);
        }

        if (action.toLowerCase() === 'kapat') {
            await Guild.findOneAndUpdate(
                { guildId: message.guild.id },
                { autorole: null },
                { upsert: true }
            );
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('✅ Otorol sistemi başarıyla kapatıldı.')
            ]});
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(action);
        if (!role) return message.reply('❌ Lütfen bir rol etiketleyin veya ID girin.');

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply('❌ Bu rol benim rolümden daha üstte! Rolümü bu rolün üzerine taşıyın.');
        }

        await Guild.findOneAndUpdate(
            { guildId: message.guild.id },
            { autorole: role.id },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Otorol Ayarlandı')
            .setDescription(`Yeni gelen üyelere artık <@&${role.id}> rolü otomatik olarak verilecek.`)
            .setFooter({ text: 'Ayarlar Dashboard ile senkronize edilmiştir.' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};