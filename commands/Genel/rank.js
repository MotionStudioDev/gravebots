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
        
        // Bar rengini ayarla (varsayılan: pink-purple)
        const barColorScheme = userLevel.barColor || 'pink-purple';
        const customBarColor = userLevel.customBarColor || '#8b5cf6';
        
        // Canvas oluştur
        const canvas = createCanvas(934, 282);
        const ctx = canvas.getContext('2d');

        // Arka plan (Düz renk - Modern Dark Theme)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dekoratif gradient overlay
        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGradient.addColorStop(0, 'rgba(26, 26, 46, 0.9)');
        bgGradient.addColorStop(1, 'rgba(15, 15, 30, 0.95)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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

        // Progress Bar (Ön - Renk Şemasına Göre)
        if (progress > 0) {
            let gradient;
            
            // Renk şeması seçimi
            switch(barColorScheme) {
                case 'blue-cyan':
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, '#3b82f6'); // Blue
                    gradient.addColorStop(0.5, '#06b6d4'); // Cyan
                    gradient.addColorStop(1, '#14b8a6'); // Teal
                    ctx.shadowColor = '#06b6d4';
                    break;
                    
                case 'green-emerald':
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, '#22c55e'); // Green
                    gradient.addColorStop(0.5, '#10b981'); // Emerald
                    gradient.addColorStop(1, '#059669'); // Dark Emerald
                    ctx.shadowColor = '#10b981';
                    break;
                    
                case 'orange-red':
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, '#f97316'); // Orange
                    gradient.addColorStop(0.5, '#ef4444'); // Red
                    gradient.addColorStop(1, '#dc2626'); // Dark Red
                    ctx.shadowColor = '#ef4444';
                    break;
                    
                case 'yellow-orange':
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, '#eab308'); // Yellow
                    gradient.addColorStop(0.5, '#f59e0b'); // Amber
                    gradient.addColorStop(1, '#d97706'); // Orange
                    ctx.shadowColor = '#f59e0b';
                    break;
                    
                case 'violet-fuchsia':
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, '#a855f7'); // Violet
                    gradient.addColorStop(0.5, '#d946ef'); // Fuchsia
                    gradient.addColorStop(1, '#ec4899'); // Pink
                    ctx.shadowColor = '#d946ef';
                    break;
                    
                case 'custom':
                    // Özel renk (tek renk)
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, customBarColor);
                    gradient.addColorStop(1, customBarColor);
                    ctx.shadowColor = customBarColor;
                    break;
                    
                default: // pink-purple (default)
                    gradient = ctx.createLinearGradient(270, 0, 870, 0);
                    gradient.addColorStop(0, '#ec4899'); // Pink
                    gradient.addColorStop(0.5, '#8b5cf6'); // Purple
                    gradient.addColorStop(1, '#6366f1'); // Indigo
                    ctx.shadowColor = '#8b5cf6';
            }
            
            // Glow efekti
            ctx.shadowBlur = 15;
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(270, 185, progress, 30, 15);
            } else {
                ctx.rect(270, 185, progress, 30);
            }
            ctx.fill();
            
            // Shadow'u sıfırla
            ctx.shadowBlur = 0;
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank-card.png' });
        message.reply({ files: [attachment] });
    }
};
