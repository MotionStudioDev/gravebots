const Giveaway = require('../models/Giveaway');
const { EmbedBuilder } = require('discord.js');

// Çekiliş bitişini işleyen fonksiyon
async function endGiveaway(giveaway, client) {
    try {
        // Zaten bitmişse atla
        if (giveaway.ended) return;

        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) {
            // Kanal silinmişse sadece DB'yi güncelle
            giveaway.ended = true;
            await giveaway.save();
            return;
        }

        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);

        // Katılımcıları en taze haliyle çek (message fetch üzerinden reaksiyonları kontrol edebiliriz ama DB de güncel gelmiştir)
        // Eğer bir kopukluk varsa, burada son bir kez reaksiyonları sayalım:
        let participantsSet = new Set(giveaway.participants);
        if (message) {
            const reaction = message.reactions.cache.get('\uD83C\uDF89') || message.reactions.cache.get('🎉');
            if (reaction) {
                const users = await reaction.users.fetch();
                users.forEach(u => {
                    if (!u.bot) participantsSet.add(u.id);
                });
            }
        }
        const freshParticipants = Array.from(participantsSet);

        // Kazananları seç
        let winnerIds = [];
        if (freshParticipants.length > 0) {
            const shuffled = [...freshParticipants].sort(() => Math.random() - 0.5);
            winnerIds = shuffled.slice(0, giveaway.winnerCount);
        }

        // DB güncelle
        giveaway.ended = true;
        giveaway.winners = winnerIds;
        giveaway.participants = freshParticipants;
        await giveaway.save();

        // Embed güncelle
        if (message) {
            const winnerMentions = winnerIds.length > 0
                ? winnerIds.map(id => `<@${id}>`).join(', ')
                : 'Kimse katılmadı 😢';

            const endEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('🎊 ÇEKİLİŞ BİTTİ!')
                .setDescription(
                    `**Ödül:** ${giveaway.prize}\n` +
                    `**Katılımcı:** ${freshParticipants.length} kişi\n` +
                    `**Kazanan(lar):** ${winnerMentions}`
                )
                .setFooter({ text: `Bitiş: ${new Date(giveaway.endTime).toLocaleString('tr-TR')}` })
                .setTimestamp();

            await message.edit({ embeds: [endEmbed] });

            if (winnerIds.length > 0) {
                const winnerMentionStr = winnerIds.map(id => `<@${id}>`).join(', ');
                await channel.send(`🎉 Tebrikler ${winnerMentionStr}! **${giveaway.prize}** çekilişini kazandın!`);
            } else {
                await channel.send(`😢 **${giveaway.prize}** çekilişi bitti ama kimse katılmadı.`);
            }
        }

        console.log(`✅ Çekiliş bitti: ${giveaway.prize} | Kazananlar: ${winnerIds.join(', ') || 'Yok'}`);
    } catch (err) {
        console.error('Çekiliş bitirme hatası:', err);
    }
}

// Aktif çekilişleri zamanlayan ve katılım senkronize eden ana fonksiyon
async function scheduleGiveaways(client) {
    try {
        const activeGiveaways = await Giveaway.find({ ended: false });
        console.log(`⏳ ${activeGiveaways.length} aktif çekiliş zamanlanıyor...`);

        for (const giveaway of activeGiveaways) {
            // 1. Durum: Katılımcıları Discord ile senkronize et (Bot kapalıyken katılanlar için)
            const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
            if (channel) {
                const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                if (message) {
                    const reaction = message.reactions.cache.get('\uD83C\uDF89') || message.reactions.cache.get('🎉');
                    if (reaction) {
                        try {
                            const users = await reaction.users.fetch();
                            let updated = false;
                            users.forEach(u => {
                                if (!u.bot && !giveaway.participants.includes(u.id)) {
                                    giveaway.participants.push(u.id);
                                    updated = true;
                                }
                            });
                            if (updated) await giveaway.save();
                        } catch (e) { console.error('Senkronizasyon hatası:', e); }
                    }
                }
            }

            // 2. Durum: Zamanlayıcıyı kur
            const now = Date.now();
            const endTime = new Date(giveaway.endTime).getTime();
            const delay = endTime - now;

            if (delay <= 0) {
                await endGiveaway(giveaway, client);
            } else {
                setTimeout(async () => {
                    const freshGiveaway = await Giveaway.findById(giveaway._id);
                    if (freshGiveaway && !freshGiveaway.ended) {
                        await endGiveaway(freshGiveaway, client);
                    }
                }, delay);
                console.log(`⏱️  "${giveaway.prize}" çekilişi ${Math.round(delay / 1000)} saniye sonra bitecek.`);
            }
        }
    } catch (err) {
        console.error('Çekiliş zamanlama hatası:', err);
    }
}

module.exports = {
    name: 'ready',
    once: true,
    async execute(readyClient, client, botOwnerIds, HARDCODED_ADMIN_ID) {
        try {
            const app = await client.application.fetch();

            if (app.owner.members) {
                app.owner.members.forEach(m => {
                    if (!botOwnerIds.includes(m.id)) botOwnerIds.push(m.id);
                });
                console.log(`✅ Bot Bir Ekip Tarafından Yönetiliyor. Yetkili ID'ler: ${botOwnerIds.join(', ')}`);
            } else {
                if (!botOwnerIds.includes(app.owner.id)) botOwnerIds.push(app.owner.id);
                console.log(`✅ Bot Sahibi Algılandı: ${app.owner.tag} (${app.owner.id})`);
            }

            if (!botOwnerIds.includes(HARDCODED_ADMIN_ID)) {
                botOwnerIds.push(HARDCODED_ADMIN_ID);
            }

        } catch (e) {
            console.error("Bot sahibi alınamadı:", e);
            if (!botOwnerIds.includes(HARDCODED_ADMIN_ID)) botOwnerIds.push(HARDCODED_ADMIN_ID);
        }

        console.log(`🤖 ${client.user.tag} giriş yaptı!`);

        // Davetleri Önbelleğe Al
        client.invites = new Map();
        client.guilds.cache.forEach(async (guild) => {
            try {
                const firstInvites = await guild.invites.fetch();
                client.invites.set(guild.id, new Map(firstInvites.map((inv) => [inv.code, inv.uses])));
                console.log(`📡 [INVITE] ${guild.name} davetleri önbelleğe alındı.`);
            } catch (err) {
                // console.log(`${guild.name} için davetler çekilemedi (Yetki eksik olabilir).`);
            }
        });

        // Çekiliş zamanlayıcılarını ve senkronizasyonu başlat
        await scheduleGiveaways(client);
    }
};