const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Belirtilen miktarda mesajı temizler.',
    category: 'Moderasyon',
    usage: 'clear <miktar>',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Mesajları Yönet` yetkiniz yok.')] });
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('❌ Lütfen 1-100 arasında bir miktar belirtin.');
        }

        try {
            const deleted = await message.channel.bulkDelete(amount, true);
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`✅ **${deleted.size}** adet mesaj başarıyla temizlendi.`)
                .setTimestamp();

            message.channel.send({ embeds: [embed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
            if (addActivity) addActivity('clear', 'Mesajlar Temizlendi', `${deleted.size} mesaj - #${message.channel.name}`, 'blue', 'fa-broom');
        } catch (e) {
            console.error(e);
            message.reply('❌ Mesajlar temizlenirken bir hata oluştu (14 günden eski mesajlar silinemez).');
        }
    }
};