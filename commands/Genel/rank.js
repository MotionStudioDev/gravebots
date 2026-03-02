const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const Level = require('../../models/Level');
const path = require('path');

module.exports = {
    name: 'rank',
    description: 'Seviye kartınızı görüntüler.',
    category: 'Genel',
    usage: 'g!rank [@kullanıcı]',
    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return message.reply('❌ Botların seviye sistemi yoktur.');

        const userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id }) || new Level({ guildId: message.guild.id, userId: target.id });
        
        // Canvas oluştur
        const canvas = createCanvas(934, 282);
        const ctx = canvas.getContext('2d');

        // Arka planı yükle
        try {
            const defaultBG = 'https://img.freepik.com/free-vector/abstract-dark-particles-background_23-2148424368.jpg';
            let bgSource = userLevel.background || defaultBG;
            
            // Eğer yüklü bir dosya ise (/uploads/ ile başlıyorsa) tam yolu belirt
            if (bgSource.startsWith('/uploads/')) {
                const relativePath = bgSource.startsWith('/') ? bgSource.slice(1) : bgSource;
                bgSource = path.join(process.cwd(), relativePath);
            }

            try {
                const background = await loadImage(bgSource);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } catch (loadErr) {
                console.error(`Rank kartı resim yüklenemedi (${bgSource}):`, loadErr.message);
                // Özel resim yüklenemezse varsayılana dön
                const background = await loadImage(defaultBG);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            }
        } catch (e) {
            console.error("Rank kartı genel arka plan hatası:", e);
            ctx.fillStyle = '#1e1e24';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Cam efekti (overlay)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(20, 20, 894, 242);

        // Avatar
        const avatar = await loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(141, 141, 95, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 46, 46, 190, 190);
        ctx.restore();

        // Kullanıcı Adı
        ctx.font = 'bold 42px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(target.username, 270, 110);

        // Seviye ve XP Bilgisi
        const nextLevelXP = userLevel.level * userLevel.level * 100;
        let progress = (userLevel.xp / nextLevelXP) * 600; 
        if (progress > 600) progress = 600;
        if (progress < 0) progress = 0;

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`Seviye: ${userLevel.level}`, 270, 165);
        
        ctx.textAlign = 'right';
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`${userLevel.xp} / ${nextLevelXP} XP`, 870, 165);
        ctx.textAlign = 'left';

        // Progress Bar (Arka)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(270, 185, 600, 30, 15);
        } else {
            ctx.rect(270, 185, 600, 30);
        }
        ctx.fill();

        // Progress Bar (Ön - Gradient)
        if (progress > 0) {
            const gradient = ctx.createLinearGradient(270, 0, 870, 0);
            gradient.addColorStop(0, '#8e2de2');
            gradient.addColorStop(1, '#4a00e0');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(270, 185, progress, 30, 15);
            } else {
                ctx.rect(270, 185, progress, 30);
            }
            ctx.fill();
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank-card.png' });
        message.reply({ files: [attachment] });
    }
};
