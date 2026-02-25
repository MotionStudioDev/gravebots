const Guild = require('../models/Guild');
const Afk = require('../models/Afk');
const { EmbedBuilder } = require('discord.js');

// Basit Spam Kontrolü İçin Bellek
const spamMap = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client, botOwnerIds, addActivity) {
        if (!message.guild || message.author.bot) {
            // Bot Engel Kontrolü (Sadece bot ise ve koruma açıksa)
            if (message.author.bot && message.guild) {
                let settings = await Guild.findOne({ guildId: message.guild.id });
                if (settings?.protections?.antiBot && !botOwnerIds.includes(message.author.id)) {
                    // Botun yetkisi varsa yeni botu atabilir (Opsiyonel, şimdilik sadece mesaj engeli)
                }
            }
            return;
        }
        
        // MongoDB'den ayarları al
        let settings = await Guild.findOne({ guildId: message.guild.id });
        if (!settings) settings = await Guild.create({ guildId: message.guild.id });

        const isOwner = botOwnerIds.includes(message.author.id);
        const isAdmin = message.member.permissions.has('Administrator');

        // --- AFK KONTROLÜ ---
        // 1. AFK olan birinden bahsedildi mi?
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(async (user) => {
                const afkData = await Afk.findOne({ userId: user.id, guildId: message.guild.id });
                if (afkData) {
                    const duration = Math.floor((Date.now() - afkData.timestamp) / 1000);
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    const timeStr = minutes > 0 ? `${minutes} dakika, ${seconds} saniye` : `${seconds} saniye`;

                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setDescription(`👤 **${user.tag}** şu an AFK.\n\n**Sebep:** ${afkData.reason}\n**Süre:** ${timeStr} önce AFK oldu.`);
                    
                    message.reply({ embeds: [embed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
                }
            });
        }

        // 2. Mesajı yazan kişi AFK mıydı? (AFK'dan Çıkar)
        const userAfk = await Afk.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (userAfk && !message.content.startsWith(settings.prefix || 'g!')) {
            const duration = Math.floor((Date.now() - userAfk.timestamp) / 1000);
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;
            
            let timeStr = "";
            if (hours > 0) timeStr += `${hours} saat `;
            if (minutes > 0) timeStr += `${minutes} dakika `;
            timeStr += `${seconds} saniye`;

            await Afk.deleteOne({ userId: message.author.id, guildId: message.guild.id });
            
            // İsmini eski haline getirme (Opsiyonel)
            if (message.member.manageable && message.member.displayName.startsWith('[AFK]')) {
                const newNick = message.member.displayName.replace('[AFK] ', '');
                message.member.setNickname(newNick).catch(() => {});
            }

            message.reply({ embeds: [
                new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`👋 Hoş geldin <@${message.author.id}>! Tekrar mesaj yazdığın için AFK modun kapatıldı.\n\n**Süre:** ${timeStr} boyunca AFK kaldın.`)
            ]}).then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000));
        }

        // --- KORUMA SİSTEMLERİ (Admin ve Sahip Muaf) ---
        if (!isOwner && !isAdmin) {
            // 1. Küfür Engel
            if (settings.protections?.antiSwear) {
                const badWords = ['küfür1', 'küfür2', 'piç', 'aq', 'amk', 'sik']; // Örnek liste, genişletilebilir
                if (badWords.some(word => message.content.toLowerCase().includes(word))) {
                    await message.delete().catch(() => {});
                    return message.channel.send({ embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setDescription(`⚠️ <@${message.author.id}>, bu sunucuda küfür kullanımı yasaktır!`)
                    ]}).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
                }
            }

            // 2. Reklam/Link Engel
            if (settings.protections?.antiLink) {
                const linkPattern = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/g;
                if (linkPattern.test(message.content) || message.content.includes('http')) {
                    await message.delete().catch(() => {});
                    return message.channel.send({ embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setDescription(`⚠️ <@${message.author.id}>, bu sunucuda reklam/link paylaşımı yasaktır!`)
                    ]}).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
                }
            }

            // 3. Caps Engel
            if (settings.protections?.antiCaps) {
                const capsCount = (message.content.match(/[A-Z]/g) || []).length;
                if (message.content.length > 5 && (capsCount / message.content.length) > 0.7) {
                    await message.delete().catch(() => {});
                    return message.channel.send({ embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0000')
                            .setDescription(`⚠️ <@${message.author.id}>, lütfen aşırı büyük harf kullanma!`)
                    ]}).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
                }
            }

            // 4. Spam Engel
            if (settings.protections?.antiSpam) {
                const now = Date.now();
                const userData = spamMap.get(message.author.id) || { count: 0, lastMessage: 0 };
                
                if (now - userData.lastMessage < 2000) { // 2 saniye içinde
                    userData.count++;
                } else {
                    userData.count = 1;
                }
                userData.lastMessage = now;
                spamMap.set(message.author.id, userData);

                if (userData.count > 5) { // 5 mesaj sınırı
                    await message.delete().catch(() => {});
                    if (userData.count === 6) {
                        return message.channel.send({ embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`⚠️ <@${message.author.id}>, çok hızlı mesaj gönderiyorsun! Spam yapma.`)
                        ]}).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
                    }
                    return;
                }
            }
        }

        const prefix = settings.prefix || 'g!';

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Bakım Modu Kontrolü
        if (global.maintenanceMode) {
            // Eğer sahipse ve komut "bakım-kapat" değilse normal devam edebilir
            // Ama kullanıcı testi görmek istiyorsa g!bakım-test gibi bir şey yapabiliriz
            // Şimdilik sahip olsa bile bakım mesajını görmesi için burayı düzenliyorum
            
            const isOwner = botOwnerIds.includes(message.author.id);
            
            // Sahipse ve g! komutu değilse veya özel bir komutsa geçsin
            // Ama genel olarak sahiplerin de görmesi için uyaralım
            if (isOwner) {
                // Sahibi bilgilendir ama komutu engelleme (opsiyonel)
                // message.channel.send('ℹ️ **Bilgi:** Bakım modu şu an açık, ancak bot sahibi olduğunuz için komutları kullanmaya devam edebilirsiniz.');
            } else {
                const { EmbedBuilder } = require('discord.js');
                const maintenanceEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🛠️ Bakım Modu Aktif')
                    .setDescription('Botumuz şu anda sizlere daha iyi hizmet verebilmek için bakıma alınmıştır.')
                    .addFields(
                        { name: 'Neden?', value: 'Yeni özellikler ekleniyor veya sistem iyileştirmeleri yapılıyor.' },
                        { name: 'Ne Zaman Biter?', value: 'En kısa sürede tekrar aktif olacağız. Anlayışınız için teşekkürler!' }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'GraveBOT Yönetim Paneli', iconURL: client.user.displayAvatarURL() });

                return message.reply({ embeds: [maintenanceEmbed] });
            }
        }

        const command = client.commands.get(commandName);
        if (!command) return;

        // Komut Yasaklama Kontrolü
        if (settings.disabledCommands.includes(commandName)) {
            return message.reply(`❌ **${commandName}** komutu bu sunucuda devre dışı bırakılmış.`);
        }

        try {
            await command.execute(message, args, client, addActivity);
        } catch (error) {
            console.error(error);
            message.reply('❌ Bu komutu çalıştırırken bir hata oluştu!');
        }
    }
};