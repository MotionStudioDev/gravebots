const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'yaş-sınırı',
    description: 'Yeni hesaplar için giriş yaş sınırını belirler.',
    category: 'Koruma',
    usage: 'yaş-sınırı <gün/kapat>',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
            ]});
        }

        const value = args[0]?.toLowerCase();

        if (!value) {
            let settings = await Guild.findOne({ guildId: message.guild.id });
            const current = settings?.protections?.ageLimit || 0;
            return message.reply(`ℹ️ Şu anki yaş sınırı: **${current === 0 ? 'Kapalı' : current + ' Gün'}**\nKullanım: \`g!yaş-sınırı <gün>\` veya \`g!yaş-sınırı kapat\``);
        }

        let limit = 0;
        if (value !== 'kapat' && value !== 'sıfır') {
            limit = parseInt(value);
            if (isNaN(limit) || limit < 0) return message.reply('❌ Lütfen geçerli bir gün sayısı girin.');
        }

        await Guild.findOneAndUpdate(
            { guildId: message.guild.id },
            { 'protections.ageLimit': limit },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor(limit > 0 ? '#00FF00' : '#FF0000')
            .setTitle('⏳ Yaş Sınırı Güncellendi')
            .setDescription(limit > 0 ? `Artık sunucuya katılan hesapların en az **${limit}** günlük olması gerekiyor.` : 'Yaş sınırı koruması devre dışı bırakıldı.')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};