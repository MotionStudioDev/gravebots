const Blacklist = require('../../models/Blacklist');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'karaliste',
    description: 'Bir kullanıcıyı veya sunucuyu kara listeye alır/çıkarır (Sadece SAHİP).',
    aliases: ['blacklist', 'kl'],
    category: 'Sistem',
    async execute(message, args, client, addActivity) {
        // Sadece sahipler
        const isOwner = client.botOwnerIds.includes(message.author.id);
        if (!isOwner) {
            return message.reply('❌ Bu komutu sadece bot sahipleri kullanabilir!');
        }

        const targetId = args[0];
        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

        if (!targetId) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📖 Kara Liste Sistemi Kullanımı')
                .setDescription('Bu komut ile bir kullanıcıyı veya sunucuyu botun kullanımından tamamen engelleyebilirsiniz.')
                .addFields(
                    { name: '📥 Ekleme/Çıkarma', value: `\`g!karaliste <ID> [sebep]\`` },
                    { name: 'ℹ️ Not', value: 'ID eğer zaten listedeyse çıkarılır, değilse eklenir (Toggle).' }
                )
                .setFooter({ text: 'GraveBOT Admin System' });

            return message.reply({ embeds: [helpEmbed] });
        }

        // ID Format Kontrolü
        if (!/^\d{17,20}$/.test(targetId)) {
            return message.reply('❌ Geçersiz ID formatı! Lütfen geçerli bir kullanıcı veya sunucu ID\'si girin.');
        }

        try {
            // Zaten var mı?
            const existing = await Blacklist.findOne({ targetId: targetId });

            if (existing) {
                // Çıkar
                await Blacklist.deleteOne({ targetId: targetId });

                if (addActivity) addActivity('remove', 'Kara Listeden Çıkarıldı', targetId, 'green', 'fa-unlock');

                return message.reply(`✅ **${targetId}** ID'li hedef başarıyla kara listeden çıkarıldı.`);
            } else {
                // Ekle
                // Tipini belirlemeye çalış (Sunucu mu Kullanıcı mı?)
                let type = 'user';
                let nameHint = targetId;

                // Botun olduğu sunucularda ara
                const guild = client.guilds.cache.get(targetId);
                if (guild) {
                    type = 'guild';
                    nameHint = guild.name;
                } else {
                    // Kullanıcı mı?
                    const user = client.users.cache.get(targetId);
                    if (user) {
                        type = 'user';
                        nameHint = user.tag;
                    }
                }

                await Blacklist.create({
                    targetId: targetId,
                    type: type,
                    reason: reason,
                    timestamp: new Date()
                });

                if (addActivity) addActivity('add', 'Kara Listeye Alındı', `${nameHint} (${type})`, 'red', 'fa-ban');

                // Eğer sunucuysa ve bot oradaysa çık
                if (type === 'guild' && guild) {
                    await guild.leave().catch(() => { });
                    return message.reply(`🚫 **${nameHint}** sunucusu kara listeye alındı ve bot sunucudan ayrıldı.\n**Sebep:** ${reason}`);
                }

                return message.reply(`✅ **${nameHint}** (${type}) kara listeye alındı.\n**Sebep:** ${reason}`);
            }
        } catch (error) {
            console.error('Kara liste komut hatası:', error);
            return message.reply('❌ İşlem sırasında bir veritabanı hatası oluştu!');
        }
    }
};
