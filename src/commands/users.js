// src/commands/users.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('users')
        .setDescription('Xem danh sách người dùng có quyền sử dụng kho plugins'),

    async execute(interaction) {
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        if (!isAuthorized) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn không có quyền xem danh sách này!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const users = await PermissionManager.getAuthorizedUsers();
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('👥 Danh sách người dùng được phép')
                .setTimestamp();

            if (users.length === 0) {
                embed.setDescription('Chưa có người dùng nào được cấp quyền!');
            } else {
                const userList = users.map((user, index) => {
                    return `**${index + 1}. ${user.username}**\n` +
                           `👤 ID: \`${user.user_id}\`\n` +
                           `🔧 Được thêm bởi: <@${user.added_by}>\n` +
                           `📅 Ngày thêm: <t:${Math.floor(new Date(user.added_at).getTime() / 1000)}:F>`;
                }).join('\n\n');

                embed.setDescription(`**Tổng cộng: ${users.length} người dùng**\n\n${userList}`);
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách users:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi lấy danh sách người dùng!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
