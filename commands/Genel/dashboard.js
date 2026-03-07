const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    name: 'dashboard',
    description: 'Web kontrol paneline erişim linkini gösterir.',
    category: 'Genel',
    usage: 'dashboard',
    async execute(message, args, client) {
        const dashboardUrl = 'http://localhost:3000';
        
        const embed = new EmbedBuilder()
            .setColor('#8b5cf6')
            .setTitle('🎛️ GraveBOT Web Kontrol Paneli')
            .setDescription('Sunucunuzu yönetmek için web paneline hoşgeldiniz!')
            .addFields(
                { name: '🔗 Panel Linki', value: `[Buraya Tıkla](${dashboardUrl})`, inline: true },
                { name: '📊 Özellikler', value: '✅ Sunucu Ayarları\n✅ Koruma Sistemleri\n✅ Çekiliş Yönetimi\n✅ Flood İstatistikleri', inline: true },
                { name: '⚙️ Yönetim', value: 'Discord hesabınız ile giriş yaparak panele erişebilirsiniz.', inline: false }
            )
            .setFooter({ text: `Talep eden: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setLabel('🔗 Panele Git')
            .setURL(dashboardUrl)
            .setStyle('Link');

        const row = new ActionRowBuilder()
            .addComponents(button);

        message.reply({ embeds: [embed], components: [row] });
    }
};
