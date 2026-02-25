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
    }
};