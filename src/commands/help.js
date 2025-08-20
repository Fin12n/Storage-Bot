// src/commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hướng dẫn sử dụng bot plugin storage'),

    async execute(interaction) {
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📚 Hướng dẫn sử dụng Plugin Storage Bot')
            .setDescription('Bot quản lý kho plugins Minecraft với các chức năng sau:')
            .setTimestamp();

        // Public commands (available to all users)
        embed.addFields({
            name: '🌐 Lệnh công khai',
            value: '• `/plugins` - Xem danh sách plugins trong kho\n' +
                   '• `/versions <plugin>` - Xem các phiên bản của plugin\n' +
                   '• `/help` - Hiển thị hướng dẫn này',
            inline: false
        });

        if (isAuthorized) {
            // Authorized user commands
            embed.addFields({
                name: '🔐 Lệnh dành cho người có quyền',
                value: '• `/upload <file>` - Upload plugin (.jar) vào kho\n' +
                       '• `/download <plugin_id>` - Tạo link tải plugin\n' +
                       '• `/adduser <user>` - Thêm người dùng vào danh sách quyền\n' +
                       '• `/removeuser <user>` - Xóa người dùng khỏi danh sách quyền\n' +
                       '• `/users` - Xem danh sách người dùng có quyền',
                inline: false
            });

            embed.addFields({
                name: '📋 Hướng dẫn chi tiết',
                value: '**Upload Plugin:**\n' +
                       '1. Sử dụng `/upload` và đính kèm file .jar\n' +
                       '2. File phải có định dạng: `PluginName-Version.jar`\n' +
                       '3. Kích thước tối đa: 25MB\n\n' +
                       '**Tạo link tải:**\n' +
                       '1. Dùng `/plugins` để xem ID plugin\n' +
                       '2. Dùng `/download <id>` để tạo link\n' +
                       '3. Link có thể giới hạn số lần tải và IP',
                inline: false
            });
        } else {
            embed.addFields({
                name: '⚠️ Lưu ý',
                value: 'Bạn chưa có quyền sử dụng các chức năng quản lý.\n' +
                       'Liên hệ admin để được cấp quyền.',
                inline: false
            });
        }

        embed.addFields({
            name: '🔗 Thông tin',
            value: '• Web server: http://localhost:3000\n' +
                   '• Health check: http://localhost:3000/health\n' +
                   '• Hỗ trợ: Liên hệ admin server',
            inline: false
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};