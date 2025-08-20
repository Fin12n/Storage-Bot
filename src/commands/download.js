// src/commands/download.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PluginManager = require('../utils/plugins');
const DownloadManager = require('../utils/downloads');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('download')
        .setDescription('Tạo link tải plugin')
        .addIntegerOption(option =>
            option.setName('plugin_id')
                .setDescription('ID của plugin cần tạo link tải')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max_downloads')
                .setDescription('Số lần tải tối đa (mặc định: 10)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('allowed_ips')
                .setDescription('Danh sách IP được phép (cách nhau bởi dấu phẩy)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('expires_hours')
                .setDescription('Số giờ hết hạn (mặc định: 24)')
                .setRequired(false)),

    async execute(interaction) {
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        if (!isAuthorized) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn không có quyền tạo link tải!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const pluginId = interaction.options.getInteger('plugin_id');
        const maxDownloads = interaction.options.getInteger('max_downloads') || 10;
        const allowedIps = interaction.options.getString('allowed_ips');
        const expiresHours = interaction.options.getInteger('expires_hours') || 24;

        try {
            // Check if plugin exists
            const plugin = await PluginManager.getPluginById(pluginId);
            
            if (!plugin) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Không tìm thấy')
                    .setDescription(`Không tìm thấy plugin với ID: ${pluginId}`)
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Create download link
            const linkId = await DownloadManager.createDownloadLink(
                pluginId,
                maxDownloads,
                allowedIps,
                interaction.user.id,
                expiresHours
            );

            const downloadUrl = `http://localhost:3000/download/${linkId}`;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Link tải đã tạo!')
                .setDescription(`Link tải cho plugin **${plugin.name}** đã được tạo thành công!`)
                .addFields(
                    { name: '🔗 Link tải', value: `[Tải xuống](${downloadUrl})`, inline: false },
                    { name: '📁 Plugin', value: plugin.full_name, inline: true },
                    { name: '🏷️ Phiên bản', value: plugin.version, inline: true },
                    { name: '📥 Lượt tải tối đa', value: maxDownloads.toString(), inline: true },
                    { name: '🕒 Hết hạn sau', value: `${expiresHours} giờ`, inline: true },
                    { name: '🌐 IP được phép', value: allowedIps || 'Tất cả', inline: true },
                    { name: '👤 Tạo bởi', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setFooter({ text: `Link ID: ${linkId}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi tạo link tải:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi tạo link tải!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
