const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'emoji',
    description: 'Sunucudaki emojileri listeler veya belirli bir emojiyi gösterir.',
    category: 'Genel',
    usage: 'g!emoji [sunucu]',
    async execute(message, args, client) {
        // Yükleniyor embed
        const loadingEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setDescription('⏳ Emojiler yükleniyor...');

        const msg = await message.channel.send({ embeds: [loadingEmbed] });

        try {
            let targetGuild = message.guild;

            // Eğer bir sunucu ID'si verilmişse (botun olduğu sunuculardan)
            if (args[0]) {
                const guildId = args[0];
                targetGuild = client.guilds.cache.get(guildId);
                
                if (!targetGuild) {
                    return msg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('Red')
                                .setTitle('❌ Sunucu Bulunamadı')
                                .setDescription('Bot bu sunucuda değil veya geçersiz ID girdiniz.')
                        ]
                    });
                }
            }

            // Emojileri çek
            const emojis = await targetGuild.emojis.fetch();
            
            if (emojis.size === 0) {
                return msg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setTitle('🚫 Emoji Yok')
                            .setDescription('Bu sunucuda hiç emoji bulunmuyor.')
                    ]
                });
            }

            // Normal ve animasyonlu emojileri ayır
            const normalEmojis = emojis.filter(e => !e.animated);
            const animatedEmojis = emojis.filter(e => e.animated);

            // Embed oluştur
            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`🎨 ${targetGuild.name} - Emojiler`)
                .setDescription(`**Toplam:** ${emojis.size} emoji\n**Normal:** ${normalEmojis.size}\n**Animasyonlu:** ${animatedEmojis.size}`)
                .setFooter({ text: `Sunucu ID: ${targetGuild.id}` });

            // Emoji listelerini string olarak hazırla (Discord limitlerine dikkat ederek)
            let normalList = '';
            let animatedList = '';

            // Normal emojiler (max 1024 karakter Discord limiti)
            normalEmojis.forEach(emoji => {
                if (normalList.length + emoji.toString().length < 1000) {
                    normalList += `${emoji} `;
                }
            });

            // Animasyonlu emojiler
            animatedEmojis.forEach(emoji => {
                if (animatedList.length + emoji.toString().length < 1000) {
                    animatedList += `${emoji} `;
                }
            });

            // Field'lara ekle
            if (normalList) {
                embed.addFields({ 
                    name: `✨ Normal Emojiler (${normalEmojis.size})`, 
                    value: normalList || 'Yok',
                    inline: false 
                });
            }

            if (animatedList) {
                embed.addFields({ 
                    name: `🎬 Animasyonlu Emojiler (${animatedEmojis.size})`, 
                    value: animatedList || 'Yok',
                    inline: false 
                });
            }

            await msg.edit({ embeds: [embed] });

        } catch (error) {
            console.error('Emoji listesi hatası:', error);
            return msg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ Hata')
                        .setDescription('Emojiler yüklenirken bir hata oluştu.')
                ]
            });
        }
    }
};
