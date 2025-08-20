// src/commands/upload.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PluginManager = require('../utils/plugins');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Upload plugin file (.jar) vào kho')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('File plugin (.jar) cần upload')
                .setRequired(true)),

    async execute(interaction) {
        // Check permissions
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        if (!isAuthorized) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn không có quyền upload plugins!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const attachment = interaction.options.getAttachment('file');
        
        // Check if file is provided
        if (!attachment) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Thiếu file')
                .setDescription('Vui lòng đính kèm file plugin!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check file extension
        if (!attachment.name.toLowerCase().endsWith('.jar')) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ File không hợp lệ')
                .setDescription('Chỉ chấp nhận file .jar!')
                .addFields(
                    { name: '📁 File được gửi', value: attachment.name, inline: true },
                    { name: '📏 Kích thước', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true }
                )
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check file size (limit 25MB)
        const MAX_SIZE = 25 * 1024 * 1024; // 25MB in bytes
        if (attachment.size > MAX_SIZE) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ File quá lớn')
                .setDescription('Kích thước file không được vượt quá 25MB!')
                .addFields(
                    { name: '📁 File', value: attachment.name, inline: true },
                    { name: '📏 Kích thước', value: `${(attachment.size / 1024 / 1024).toFixed(2)} MB`, inline: true }
                )
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Defer reply for long operations
        await interaction.deferReply({ ephemeral: true });

        try {
            // Download file from Discord
            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error('Không thể tải file từ Discord');
            }

            const buffer = await response.arrayBuffer();
            
            // Create file object similar to multer
            const file = {
                originalname: attachment.name,
                size: attachment.size,
                buffer: Buffer.from(buffer)
            };

            // Save plugin using PluginManager
            const savedPlugin = await PluginManager.savePlugin(file, interaction.user.id);

            // Success response
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Upload thành công!')
                .setDescription(`Plugin **${savedPlugin.name}** đã được upload thành công!`)
                .addFields(
                    { name: '📁 Tên file', value: savedPlugin.fullName, inline: true },
                    { name: '🏷️ Plugin name', value: savedPlugin.name, inline: true },
                    { name: '📊 Phiên bản', value: savedPlugin.version, inline: true },
                    { name: '💾 Kích thước', value: `${(savedPlugin.fileSize / 1024).toFixed(2)} KB`, inline: true },
                    { name: '🆔 Plugin ID', value: savedPlugin.id.toString(), inline: true },
                    { name: '👤 Upload bởi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📂 Thư mục', value: savedPlugin.folderName, inline: false }
                )
                .setFooter({ text: `Sử dụng /download ${savedPlugin.id} để tạo link tải` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi khi upload plugin:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi upload')
                .setDescription('Có lỗi xảy ra khi upload plugin!')
                .addFields(
                    { name: '🐛 Chi tiết lỗi', value: error.message || 'Unknown error', inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};