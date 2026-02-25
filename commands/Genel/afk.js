const { EmbedBuilder } = require('discord.js');
const Afk = require('../../models/Afk');

module.exports = {
    name: 'afk',
    description: 'AFK moduna girmenizi sağlar.',
    category: 'Genel',
    usage: 'afk [sebep]',
    async execute(message, args, client) {
        const reason = args.join(' ') || 'Sebep belirtilmedi';
        
        try {
            await Afk.findOneAndUpdate(
                { userId: message.author.id, guildId: message.guild.id },
                { reason: reason, timestamp: Date.now() },
                { upsert: true, new: true }
            );

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(`✅ Başarıyla AFK moduna girdiniz.\n\n**Sebep:** ${reason}`)
                .setFooter({ text: 'Mesaj yazdığınızda AFK modundan çıkacaksınız.' })
                .setTimestamp();

            message.reply({ embeds: [embed] });

            // Kullanıcının ismini değiştirme (Opsiyonel, botun yetkisi varsa)
            if (message.member.manageable && !message.member.displayName.startsWith('[AFK]')) {
                message.member.setNickname(`[AFK] ${message.member.displayName}`).catch(() => {});
            }

        } catch (error) {
            console.error('AFK hatası:', error);
            message.reply('❌ AFK moduna girerken bir hata oluştu.');
        }
    }
};