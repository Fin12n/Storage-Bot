// src/commands/removeuser.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeuser')
        .setDescription('Xóa người dùng khỏi danh sách được phép sử dụng kho plugins')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng cần xóa quyền')
                .setRequired(true)
        ),

    async execute(interaction) {
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        if (!isAuthorized) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn không có quyền sử dụng lệnh này!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        
        // Prevent self-removal (optional)
        if (targetUser.id === interaction.user.id) {
            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Cảnh báo')
                .setDescription('Bạn không thể xóa quyền của chính mình!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const success = await PermissionManager.removeUser(targetUser.id);

            const embed = new EmbedBuilder()
                .setColor(success ? '#00ff00' : '#ffaa00')
                .setTitle(success ? '✅ Thành công' : '⚠️ Thông báo')
                .setDescription(success ? 
                    `Đã xóa ${targetUser.username} khỏi danh sách được phép sử dụng kho plugins!` :
                    `${targetUser.username} không có trong danh sách quyền!`
                )
                .addFields(
                    { name: '👤 Người bị xóa', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🔧 Xóa bởi', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi xóa user:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi xóa người dùng!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};