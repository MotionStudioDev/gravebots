const Blacklist = require('../models/Blacklist');

module.exports = {
    name: 'guildCreate',
    async execute(guild, client, botOwnerIds, addActivity) {
        console.log(`📡 Bot yeni bir sunucuya katıldı: ${guild.name} (${guild.id})`);

        // Kara Liste Kontrolü
        const isBlacklisted = await Blacklist.findOne({ targetId: guild.id, type: 'guild' });

        if (isBlacklisted) {
            console.log(`⚠️ [BLACKLIST] Kara listedeki bir sunucuya (${guild.name}) katılma denemesi engellendi. Sunucudan çıkılıyor...`);

            // Sahibe veya sistem kanalına bildirim göndermeye çalışılabilir
            try {
                const owner = await guild.fetchOwner();
                if (owner) {
                    await owner.send(`⚠️ **GraveBOT Bilgilendirme**\n\nSunucunuz (${guild.name}) botumuzun kara listesinde olduğu için bot otomatik olarak ayrılmıştır.\nEğer bir yanlışlık olduğunu düşünüyorsanız bot sahibiyle iletişime geçebilirsiniz.`).catch(() => { });
                }
            } catch (e) { }

            await guild.leave().catch(() => { });
            addActivity('remove', 'Sunucu Kara Listede', guild.name, 'black', 'fa-ban');
        } else {
            addActivity('plus', 'Yeni Sunucuya Katıldı', guild.name, 'green', 'fa-server');
        }
    }
};
