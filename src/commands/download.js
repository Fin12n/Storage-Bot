// src/commands/download.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PluginManager = require('../utils/plugins');
const DownloadManager = require('../utils/downloads');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('download')
        .setDescription('Tạo link tải plugin với các tùy chọn bảo mật')
        .addIntegerOption(option =>
            option.setName('plugin_id')
                .setDescription('ID của plugin cần tạo link tải (xem trong /versions)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max_downloads')
                .setDescription('Số lần tải tối đa (1-100, mặc định: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100))
        .addIntegerOption(option =>
            option.setName('expires_hours')
                .setDescription('Số giờ hết hạn (1-168, mặc định: 24)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168)) // Max 7 days
        .addStringOption(option =>
            option.setName('allowed_ips')
                .setDescription('Danh sách IP được phép tải (cách nhau bởi dấu phẩy, để trống = tất cả IP)')
                .setRequired(false)),

    async execute(interaction) {
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        if (!isAuthorized) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn không có quyền tạo link tải!')
                .addFields({
                    name: '💡 Lưu ý',
                    value: 'Liên hệ admin để được cấp quyền sử dụng chức năng này.',
                    inline: false
                })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const pluginId = interaction.options.getInteger('plugin_id');
        const maxDownloads = interaction.options.getInteger('max_downloads') || 10;
        const expiresHours = interaction.options.getInteger('expires_hours') || 24;
        const allowedIps = interaction.options.getString('allowed_ips');

        // Validate and parse IPs if provided
        let ipList = null;
        if (allowedIps) {
            ipList = allowedIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
            
            // Basic IP validation
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            const invalidIps = ipList.filter(ip => !ipRegex.test(ip));
            
            if (invalidIps.length > 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ IP không hợp lệ')
                    .setDescription('Một số IP trong danh sách không đúng định dạng!')
                    .addFields(
                        { name: '🔍 IP không hợp lệ', value: invalidIps.join(', '), inline: false },
                        { name: '✅ Định dạng đúng', value: 'Ví dụ: `192.168.1.1,10.0.0.1`', inline: false }
                    )
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if plugin exists
            const plugin = await PluginManager.getPluginById(pluginId);
            
            if (!plugin) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Không tìm thấy Plugin')
                    .setDescription(`Không tìm thấy plugin với ID: **${pluginId}**`)
                    .addFields({
                        name: '💡 Hướng dẫn',
                        value: '• Sử dụng `/plugins` để xem danh sách plugins\n• Sử dụng `/versions <plugin_name>` để lấy Plugin ID chính xác',
                        inline: false
                    })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }

            // Create download link
            const linkId = await DownloadManager.createDownloadLink(
                pluginId,
                maxDownloads,
                ipList ? ipList.join(',') : null,
                interaction.user.id,
                expiresHours
            );

            const downloadUrl = `${process.env.BASE_URL || 'http://46.247.108.38:6265'}/download/${linkId}`;
            const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

            // Create success embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Link tải đã được tạo!')
                .setDescription(`🎉 Link tải cho **${plugin.name}** version **${plugin.version}** đã sẵn sàng!`)
                .addFields(
                    { name: '📁 Plugin', value: plugin.full_name, inline: true },
                    { name: '🏷️ Version', value: plugin.version, inline: true },
                    { name: '💾 Kích thước', value: `${(plugin.file_size / 1024 / 1024).toFixed(1)} MB`, inline: true },
                    { name: '🔗 Link tải', value: `[**Nhấn để tải xuống**](${downloadUrl})`, inline: false },
                    { name: '📥 Giới hạn tải', value: `${maxDownloads} lần`, inline: true },
                    { name: '🕒 Hết hạn', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                    { name: '⏰ Còn lại', value: `${expiresHours} giờ`, inline: true }
                )
                .setTimestamp();

            // Add IP restrictions info
            if (ipList && ipList.length > 0) {
                embed.addFields({
                    name: '🌐 IP được phép',
                    value: ipList.length <= 5 ? ipList.join(', ') : `${ipList.slice(0, 5).join(', ')} và ${ipList.length - 5} IP khác`,
                    inline: false
                });
                embed.setColor('#ffaa00'); // Orange for restricted access
            } else {
                embed.addFields({
                    name: '🌐 Truy cập',
                    value: '🌍 Tất cả IP đều có thể tải',
                    inline: false
                });
            }

            embed.addFields(
                { name: '👤 Tạo bởi', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🆔 Link ID', value: `\`${linkId}\``, inline: true },
                { name: '📊 Trạng thái', value: '🟢 Hoạt động', inline: true }
            );

            // Add usage stats
            embed.addFields({
                name: '📈 Thống kê sử dụng',
                value: `📥 Đã tải: **0/${maxDownloads}** lần\n⏱️ Tạo: <t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: false
            });

            embed.setFooter({ 
                text: `Link ID: ${linkId} • Sử dụng responsibly` 
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi khi tạo link tải:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi tạo link tải')
                .setDescription('Có lỗi xảy ra khi tạo link tải!')
                .addFields(
                    { name: '🐛 Chi tiết lỗi', value: error.message || 'Unknown error', inline: false },
                    { name: '💡 Gợi ý', value: '• Kiểm tra lại Plugin ID\n• Thử lại sau vài giây\n• Liên hệ admin nếu lỗi tiếp tục', inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};