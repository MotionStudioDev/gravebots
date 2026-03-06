const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Giveaway = require('../../models/Giveaway');

module.exports = {
    name: 'çekiliş',
    description: 'Yeni bir çekiliş başlatır.',
    usage: 'çekiliş [süre(dk)] [kazanan_sayısı] [ödül]',
    category: 'Sistem',
    async execute(message, args, client, addActivity) {
        // Yetki Kontrolü
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return message.reply('❌ Bu komutu kullanmak için `Sunucuyu Yönet` yetkisine sahip olmalısınız.');
        }

        const duration = parseInt(args[0]);
        const winnerCount = parseInt(args[1]);
        const prize = args.slice(2).join(' ');

        if (!duration || isNaN(duration) || duration <= 0) {
            return message.reply('❌ Geçerli bir süre (dakika) girmelisiniz!');
        }
        if (!winnerCount || isNaN(winnerCount) || winnerCount <= 0) {
            return message.reply('❌ Geçerli bir kazanan sayısı girmelisiniz!');
        }
        if (!prize) {
            return message.reply('❌ Bir ödül girmelisiniz!');
        }

        const endTime = new Date(Date.now() + duration * 60000);

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('🎉 ÇEKİLİŞ BAŞLADI!')
            .setDescription(
                `**Ödül:** ${prize}\n` +
                `**Bitiş:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n` +
                `**Kazanan Sayısı:** ${winnerCount}\n\n` +
                `Katılmak için 🎉 tepkisine tıkla!`
            )
            .setFooter({ text: `Bitiş: ${endTime.toLocaleString('tr-TR')}` })
            .setTimestamp();

        const msg = await message.channel.send({ embeds: [embed] });
        await msg.react('🎉');

        const newGiveaway = await Giveaway.create({
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: msg.id,
            prize,
            winnerCount,
            endTime
        });

        // Otomatik bitirme zamanlayıcısı kur (ready.js'deki mantıkla aynı)
        const delay = endTime.getTime() - Date.now();
        setTimeout(async () => {
            try {
                // Bu fonksiyon ready.js içindeki endGiveaway mantığını kullanmalı.
                // Kolaylık olması için ready.js'deki fonksiyonu buraya da kopyalayabiliriz 
                // ya da bot.js'deki endpoint mantığını kullanabiliriz.

                // Bot.js'deki bitirme mantığını buraya da ekliyoruz:
                const freshGiveaway = await Giveaway.findById(newGiveaway._id);
                if (!freshGiveaway || freshGiveaway.ended) return;

                let winnerIds = [];
                if (freshGiveaway.participants.length > 0) {
                    const shuffled = [...freshGiveaway.participants].sort(() => Math.random() - 0.5);
                    winnerIds = shuffled.slice(0, freshGiveaway.winnerCount);
                }

                freshGiveaway.ended = true;
                freshGiveaway.winners = winnerIds;
                await freshGiveaway.save();

                const ch = await client.channels.fetch(freshGiveaway.channelId).catch(() => null);
                if (ch) {
                    const endMsg = await ch.messages.fetch(freshGiveaway.messageId).catch(() => null);
                    const winnerMentions = winnerIds.length > 0
                        ? winnerIds.map(id => `<@${id}>`).join(', ')
                        : 'Kimse katılmadı 😢';

                    if (endMsg) {
                        const endEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle('🎊 ÇEKİLİŞ BİTTİ!')
                            .setDescription(
                                `**Ödül:** ${freshGiveaway.prize}\n` +
                                `**Katılımcı:** ${freshGiveaway.participants.length} kişi\n` +
                                `**Kazanan(lar):** ${winnerMentions}`
                            )
                            .setFooter({ text: `Bitiş: ${new Date(freshGiveaway.endTime).toLocaleString('tr-TR')}` })
                            .setTimestamp();
                        await endMsg.edit({ embeds: [endEmbed] });
                    }

                    if (winnerIds.length > 0) {
                        await ch.send(`🎉 Tebrikler ${winnerIds.map(id => `<@${id}>`).join(', ')}! **${freshGiveaway.prize}** çekilişini kazandın!`);
                    } else {
                        await ch.send(`😢 **${freshGiveaway.prize}** çekilişi bitti ama kimse katılmadı.`);
                    }
                }
                addActivity('gift', `Çekiliş Bitti: ${freshGiveaway.prize}`, `${message.guild.name}`, 'pink', 'fa-gift');
            } catch (err) {
                console.error('Çekiliş komut bitirme hatası:', err);
            }
        }, delay);

        addActivity('gift', `Çekiliş Başlatıldı: ${prize}`, `${message.guild.name}`, 'pink', 'fa-gift');
        console.log(`🎉 [CMD] "${prize}" çekilişi ${message.guild.name} sunucusunda başlatıldı.`);
    }
};
