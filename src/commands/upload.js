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
            // Preview what will be detected before download
            const previewParse = PluginManager.parsePluginName(attachment.name);
            
            // Show preview embed first
            const previewEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🔍 Đang phân tích file...')
                .setDescription(`Phát hiện plugin: **${previewParse.name}** version **${previewParse.version}**`)
                .addFields(
                    { name: '📁 File gốc', value: attachment.name, inline: true },
                    { name: '🏷️ Plugin Name', value: previewParse.name, inline: true },
                    { name: '📊 Version', value: previewParse.version, inline: true },
                    { name: '📂 Folder sẽ tạo', value: previewParse.folderName, inline: true },
                    { name: '📁 File sẽ lưu', value: `${previewParse.folderName}-${previewParse.version}.jar`, inline: true },
                    { name: '🗂️ Đường dẫn', value: `plugins/${previewParse.folderName}/`, inline: true }
                )
                .setFooter({ text: 'Đang tải file từ Discord...' })
                .setTimestamp();

            await interaction.editReply({ embeds: [previewEmbed] });

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

            // Update status
            const processingEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⚙️ Đang xử lý...')
                .setDescription(`Đang lưu plugin **${previewParse.name}** vào thư mục **${previewParse.folderName}**`)
                .addFields(
                    { name: '📁 File đã tải', value: attachment.name, inline: true },
                    { name: '💾 Kích thước', value: `${(attachment.size / 1024).toFixed(2)} KB`, inline: true }
                )
                .setFooter({ text: 'Đang tạo thư mục và lưu file...' })
                .setTimestamp();

            await interaction.editReply({ embeds: [processingEmbed] });

            // Save plugin using PluginManager
            const savedPlugin = await PluginManager.savePlugin(file, interaction.user.id);

            // Check if this is a new plugin or new version
            const existingVersions = await PluginManager.getPluginVersions(savedPlugin.name);
            const isNewPlugin = existingVersions.length === 1; // Only has the version we just uploaded
            
            // Success response with detailed info
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Upload thành công!')
                .setDescription(isNewPlugin ? 
                    `🎉 Plugin mới **${savedPlugin.name}** đã được thêm vào kho!` : 
                    `📦 Version mới của **${savedPlugin.name}** đã được thêm!`)
                .addFields(
                    { name: '📁 File gốc', value: attachment.name, inline: true },
                    { name: '📂 Thư mục', value: savedPlugin.folderName, inline: true },
                    { name: '🏷️ Plugin name', value: savedPlugin.name, inline: true },
                    { name: '📊 Phiên bản', value: savedPlugin.version, inline: true },
                    { name: '💾 Kích thước', value: `${(savedPlugin.fileSize / 1024).toFixed(2)} KB`, inline: true },
                    { name: '🆔 Plugin ID', value: savedPlugin.id.toString(), inline: true },
                    { name: '📁 File đã lưu', value: savedPlugin.fullName, inline: false },
                    { name: '🗂️ Đường dẫn đầy đủ', value: `plugins/${savedPlugin.folderName}/${savedPlugin.fullName}`, inline: false },
                    { name: '👤 Upload bởi', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📊 Tổng versions', value: existingVersions.length.toString(), inline: true }
                )
                .setFooter({ text: `Sử dụng /download ${savedPlugin.id} để tạo link tải • /versions ${savedPlugin.name} để xem tất cả versions` })
                .setTimestamp();

            // Add status indicators
            if (isNewPlugin) {
                embed.addFields({ name: '🆕 Trạng thái', value: 'Plugin mới được tạo', inline: true });
            } else {
                const isNewerVersion = savedPlugin.version.includes('-'); // Has timestamp suffix
                embed.addFields({ 
                    name: '🔄 Trạng thái', 
                    value: isNewerVersion ? 'Version trùng lặp (đã thêm timestamp)' : 'Version mới', 
                    inline: true 
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi khi upload plugin:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi upload')
                .setDescription('Có lỗi xảy ra khi upload plugin!')
                .addFields(
                    { name: '📁 File', value: attachment.name, inline: true },
                    { name: '🐛 Chi tiết lỗi', value: error.message || 'Unknown error', inline: false }
                )
                .setFooter({ text: 'Vui lòng thử lại hoặc liên hệ admin' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};