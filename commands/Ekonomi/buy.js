const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const User = require('../../models/User');
const Guild = require('../../models/Guild');

module.exports = {
    name: 'satınal',
    aliases: ['buy', 'al'],
    description: 'Marketten bir ürün satın almanızı sağlar.',
    category: 'Ekonomi',
    usage: 'satınal <ürün_adı>',
    async execute(message, args, client) {
        if (!args[0]) return message.reply('❌ Lütfen satın almak istediğiniz ürünün adını girin.');

        const settings = await Guild.findOne({ guildId: message.guild.id });
        if (!settings || !settings.shop || settings.shop.length === 0) {
            return message.reply('❌ Bu sunucuda henüz market kurulmamış.');
        }

        const itemName = args.join(' ').toLowerCase();
        const item = settings.shop.find(i => i.name.toLowerCase() === itemName);

        if (!item) return message.reply(`❌ **${args.join(' ')}** adında bir ürün bulamadım.`);

        let user = await User.findOne({ userId: message.author.id });
        if (!user || user.money < item.price) {
            return message.reply(`❌ Cüzdanınızda yeterli para yok! Gereken: **${item.price} 💸**`);
        }

        // Rol kontrolü
        if (item.roleId) {
            const role = message.guild.roles.cache.get(item.roleId);
            if (!role) return message.reply('❌ Bu ürünle ilişkilendirilmiş rol sunucuda bulunamadı.');
            if (message.member.roles.cache.has(item.roleId)) return message.reply('❌ Zaten bu role sahipsiniz!');
            
            try {
                await message.member.roles.add(role);
            } catch (e) {
                return message.reply('❌ Rol verilirken bir hata oluştu. Yetkim yetmiyor olabilir.');
            }
        }

        // Ödemeyi al
        user.money -= item.price;
        user.inventory.push({ name: item.name, date: Date.now() });
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('🎁 Satın Alım Başarılı')
            .setDescription(`Tebrikler! **${item.name}** ürününü başarıyla satın aldınız.`)
            .addFields(
                { name: '💰 Ödenen', value: `${item.price} 💸`, inline: true },
                { name: '👛 Kalan Para', value: `${user.money} 💸`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
