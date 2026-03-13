const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'yasakli-kelime',
    description: 'Sunucu yasaklı kelimelerini yönetir - Prefix ile yapılandırma.',
    aliases: ['yasak', 'yk', 'bannedword', 'banned'],
    category: 'Sistem',
    usage: 'yasakli-kelime <ekle/çıkar/listele/aç/kapat> [kelime]',
    
    async execute(message, args, client, addActivity) {
        // Yönetici Kontrolü
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('❌ Bu komutu kullanmak için `Yönetici` yetkiniz yok.')
                ]
            });
        }

        const subcommand = args[0]?.toLowerCase();
        const kelime = args.slice(1).join(' ').trim();

        try {
            // Database'den konfigürasyon al
            let settings = await Guild.findOne({ guildId: message.guild.id });
            if (!settings) {
                settings = await Guild.create({ guildId: message.guild.id });
            }

            if (!settings.protections) {
                settings.protections = {};
            }

            if (!settings.protections.bannedTags) {
                settings.protections.bannedTags = [];
            }

            const prefix = settings.prefix || 'g!';

            // Fonksiyon: Yasaklı Kelimeler Paneli Oluştur
            const createBannedWordsPanel = async (guildId) => {
                const s = await Guild.findOne({ guildId });
                const bannedCount = s?.protections?.bannedTags?.length || 0;
                const status = s?.protections?.antiSwear || false;

                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🚫 Yasaklı Kelimeler Yönetimi')
                    .setDescription(`Komut Kullanımı: \`${prefix}yasakli-kelime <ekle/çıkar/listele/aç/kapat> [kelime]\``)
                    .addFields(
                        { name: '📊 Toplam Kelime', value: `\`${bannedCount}\``, inline: true },
                        { name: '🔒 Filtre Durumu', value: status ? '🟢 Aktif (antiSwear)' : `🔴 İnaktif (\`${prefix}koruma antiswear aç\` ile aç)`, inline: true },
                        { name: '\n📝 Komutlar', value: `\`ekle\` - Kelime ekle\n\`çıkar\` - Kelime çıkar\n\`listele\` - Kelimeleri göster\n\`temizle\` - Tümünü sil\n\`aç/kapat\` - Filtreyi aç/kapat`, inline: false }
                    )
                    .setFooter({ text: 'Yasaklı Kelimeler Sistemi' })
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('banned_words_open')
                            .setLabel('Filtreyi Aç')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🔓'),
                        new ButtonBuilder()
                            .setCustomId('banned_words_close')
                            .setLabel('Filtreyi Kapat')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                return { embeds: [embed], components: [row] };
            };

            // Ana Menü - Yardım / Panel
            if (!subcommand) {
                const panel = await createBannedWordsPanel(message.guild.id);
                const response = await message.reply(panel);

                // Buton Kolektörü
                const collector = response.createMessageComponentCollector({ 
                    filter: i => i.user.id === message.author.id, 
                    time: 60000 
                });

                collector.on('collect', async i => {
                    const openFilter = i.customId === 'banned_words_open';
                    
                    // Mevcut durumu kontrol et
                    const currentSettings = await Guild.findOne({ guildId: message.guild.id });
                    const currentStatus = currentSettings?.protections?.antiSwear;

                    if (currentStatus === openFilter) {
                        return i.reply({ 
                            content: `⚠️ Filtre zaten **${openFilter ? 'AÇIK' : 'KAPALI'}** durumda!`, 
                            ephemeral: true 
                        });
                    }

                    // Filtreyi güncelle
                    await Guild.findOneAndUpdate(
                        { guildId: message.guild.id },
                        { 'protections.antiSwear': openFilter },
                        { upsert: true }
                    );

                    if (addActivity) {
                        addActivity(openFilter ? 'enable' : 'disable', 'Yasaklı Kelime Filtresi', openFilter ? 'Açıldı' : 'Kapatıldı', openFilter ? 'green' : 'yellow', openFilter ? 'fa-lock-open' : 'fa-lock');
                    }

                    const updatedPanel = await createBannedWordsPanel(message.guild.id);
                    await i.update(updatedPanel);
                });

                collector.on('end', () => {
                    response.edit({ components: [] }).catch(() => {});
                });

                return;
            }

            // AÇ/KAPAT - Filtreyi Aç veya Kapat
            if (subcommand === 'aç' || subcommand === 'ac' || subcommand === 'aç' || subcommand === 'open') {
                const currentStatus = settings.protections.antiSwear;
                
                if (currentStatus) {
                    return message.reply('⚠️ Yasaklı Kelime Filtresi zaten **AÇIK**!');
                }

                settings.protections.antiSwear = true;
                await settings.save();

                if (addActivity) {
                    addActivity('enable', 'Yasaklı Kelime Filtresi', 'Açıldı', 'green', 'fa-lock-open');
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Filtre Aktifleştirildi')
                            .setDescription('🚫 Yasaklı Kelime Filtresi **AÇIK**')
                            .addFields(
                                { name: 'Toplam Kelime', value: `${settings.protections.bannedTags.length}`, inline: true }
                            )
                            .setFooter({ text: 'Yasaklı Kelimeler Sistemi' })
                    ]
                });
            }

            if (subcommand === 'kapat' || subcommand === 'close') {
                const currentStatus = settings.protections.antiSwear;
                
                if (!currentStatus) {
                    return message.reply('⚠️ Yasaklı Kelime Filtresi zaten **KAPALI**!');
                }

                settings.protections.antiSwear = false;
                await settings.save();

                if (addActivity) {
                    addActivity('disable', 'Yasaklı Kelime Filtresi', 'Kapatıldı', 'yellow', 'fa-lock');
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FFA500')
                            .setTitle('⚠️ Filtre Devre Dışı')
                            .setDescription('🔓 Yasaklı Kelime Filtresi **KAPALI**')
                            .setFooter({ text: 'Yasaklı Kelimeler Sistemi' })
                    ]
                });
            }

            // EKLE - Kelime Ekleme
            if (subcommand === 'ekle' || subcommand === 'add') {
                if (!kelime) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`❌ Kullanım: \`${prefix}yasakli-kelime ekle <kelime>\``)
                        ]
                    });
                }

                const lowerKelime = kelime.toLowerCase().trim();

                // Zaten var mı kontrol et
                if (settings.protections.bannedTags.some(k => k.toLowerCase() === lowerKelime)) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setDescription(`❌ **"${kelime}"** zaten yasaklı kelimeler listesinde bulunuyor.`)
                        ]
                    });
                }

                // Ekle
                settings.protections.bannedTags.push(kelime);
                await settings.save();

                if (addActivity) {
                    addActivity('add', 'Yasaklı Kelime Eklendi', `"${kelime}"`, 'red', 'fa-ban');
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Kelime Eklendi')
                            .addFields(
                                { name: 'Kelime', value: `\`${kelime}\``, inline: true },
                                { name: 'Toplam', value: `${settings.protections.bannedTags.length}`, inline: true },
                                { name: 'Filtre', value: settings.protections.antiSwear ? '🟢 AÇIK' : '🔴 KAPALI', inline: true }
                            )
                            .setFooter({ text: 'Yasaklı Kelimeler Sistemi' })
                    ]
                });
            }

            // ÇIKAR - Kelime Çıkarma
            if (subcommand === 'çıkar' || subcommand === 'cikar' || subcommand === 'remove') {
                if (!kelime) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF0000')
                                .setDescription(`❌ Kullanım: \`${prefix}yasakli-kelime çıkar <kelime>\``)
                        ]
                    });
                }

                const lowerKelime = kelime.toLowerCase().trim();
                const index = settings.protections.bannedTags.findIndex(k => k.toLowerCase() === lowerKelime);

                if (index === -1) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setDescription(`❌ **"${kelime}"** yasaklı kelimeler listesinde bulunamadı.`)
                        ]
                    });
                }

                // Çıkar
                const removed = settings.protections.bannedTags.splice(index, 1)[0];
                await settings.save();

                if (addActivity) {
                    addActivity('remove', 'Yasaklı Kelime Kaldırıldı', `"${removed}"`, 'green', 'fa-unlock');
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Kelime Çıkarıldı')
                            .addFields(
                                { name: 'Kelime', value: `\`${removed}\``, inline: true },
                                { name: 'Kalan', value: `${settings.protections.bannedTags.length}`, inline: true }
                            )
                            .setFooter({ text: 'Yasaklı Kelimeler Sistemi' })
                    ]
                });
            }

            // LİSTELE - Kelimeleri Listeleme
            if (subcommand === 'listele' || subcommand === 'list') {
                if (settings.protections.bannedTags.length === 0) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle('📋 Yasaklı Kelimeler Listesi')
                                .setDescription('❌ Henüz hiç yasaklı kelime belirtilmemiş.')
                                .setFooter({ text: 'Kelime eklemek için: g!yasakli-kelime ekle <kelime>' })
                        ]
                    });
                }

                // Kelimeler 1000 karakteri aşarsa paginate et
                const kelimeleriStr = settings.protections.bannedTags.join(', ');
                let description = '';

                if (kelimeleriStr.length > 500) {
                    const chunks = [];
                    let chunk = '';
                    const kelimeler = settings.protections.bannedTags;
                    
                    kelimeler.forEach(kelime => {
                        if ((chunk + kelime).length > 450) {
                            chunks.push(chunk);
                            chunk = kelime;
                        } else {
                            chunk += (chunk ? ', ' : '') + kelime;
                        }
                    });
                    if (chunk) chunks.push(chunk);

                    // İlk chunk'ı kullan
                    description = chunks[0];

                    const listEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle(`📋 Yasaklı Kelimeler Listesi (${settings.protections.bannedTags.length})`)
                        .setDescription(description)
                        .addFields(
                            { name: 'Durum', value: settings.protections.antiSwear ? '🟢 Filtre Aktif' : '🔴 Filtre İnaktif', inline: true },
                            { name: 'Toplam Kelime', value: `${settings.protections.bannedTags.length}`, inline: true }
                        );

                    if (chunks.length > 1) {
                        listEmbed.addFields({
                            name: '📌 Not',
                            value: `Tüm kelimeleri görmek için **dashboard** kontrol panelini kullanın.`
                        });
                    }

                    return message.reply({ embeds: [listEmbed] });
                }

                const listEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`📋 Yasaklı Kelimeler Listesi (${settings.protections.bannedTags.length})`)
                    .setDescription(`\`\`\`${kelimeleriStr}\`\`\``)
                    .addFields(
                        { name: 'Durum', value: settings.protections.antiSwear ? '🟢 Filtre Aktif' : '🔴 Filtre İnaktif', inline: true },
                        { name: 'Toplam Kelime', value: `${settings.protections.bannedTags.length}`, inline: true }
                    )
                    .setFooter({ text: 'Yasaklı Kelimeler Sistemi' });

                return message.reply({ embeds: [listEmbed] });
            }

            // TEMIZLE - Tüm Kelimeleri Silme
            if (subcommand === 'temizle' || subcommand === 'clear') {
                if (settings.protections.bannedTags.length === 0) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FFA500')
                                .setDescription('ℹ️ Temizlenecek bir yasaklı kelime yok.')
                        ]
                    });
                }

                const count = settings.protections.bannedTags.length;
                settings.protections.bannedTags = [];
                await settings.save();

                if (addActivity) {
                    addActivity('clear', 'Yasaklı Kelimeler Temizlendi', `${count} kelime silindi`, 'yellow', 'fa-trash');
                }

                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Temizleme Tamamlandı')
                            .setDescription(`**${count}** yasaklı kelime başarıyla silindi.`)
                            .setFooter({ text: 'Yasaklı Kelimeler Sistemi' })
                    ]
                });
            }

            // Bilinmeyen Subcommand
            return message.reply(`❌ Bilinmeyen komut. Kullanımı görmek için: \`${prefix}yasakli-kelime\``);

        } catch (error) {
            console.error('Yasaklı kelime komut hatası:', error);
            return message.reply('❌ Bir işlem hatası oluştu!');
        }
    }
};
