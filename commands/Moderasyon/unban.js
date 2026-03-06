const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Infraction = require('../../models/Infraction');

module.exports = {
    name: 'unban',
    description: 'Kullanıcının yasaklamasını kaldırır.',
    category: 'Moderasyon',
    usage: 'unban <kullanıcı_id>',
    async execute(message, args, client, addActivity) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('❌ Bu komutu kullanmak için `Üyeleri Yasakla` yetkiniz yok.')
            ]});
        }

        const userId = args[0];
        if (!userId) return message.reply('❌ Lütfen yasaklaması kaldırılacak kullanıcının ID\'sini girin.');

        try {
            await message.guild.members.unban(userId);
            
            // Veritabanındaki ban kayıtlarını inaktif et
            await Infraction.updateMany(
                { guildId: message.guild.id, userId: userId, type: 'ban', active: true },
                { active: false }
            );

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 Yasaklama Kaldırıldı')
                .setDescription(`<@${userId}> (\`${userId}\`) kullanıcısının yasaklaması başarıyla kaldırıldı.`)
                .addFields({ name: '🛡️ Yetkili', value: `${message.author.tag}` })
                .setTimestamp();

            message.reply({ embeds: [embed] });
            if (addActivity) addActivity('unban', 'Yasaklama Kaldırıldı', `${userId} - ${message.guild.name}`, 'green', 'fa-user-check');
        } catch (e) {
            console.error(e);
            message.reply('❌ Yasaklama kaldırılırken bir hata oluştu. Kullanıcı yasaklı olmayabilir veya ID hatalı.');
        }
    }
};
