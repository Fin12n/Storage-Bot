const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adduser')
        .setDescription('Thêm người dùng vào danh sách được phép sử dụng kho plugins')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng cần thêm quyền')
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
        
        try {
            const success = await PermissionManager.addUser(
                targetUser.id, 
                targetUser.username, 
                interaction.user.id
            );

            const embed = new EmbedBuilder()
                .setColor(success ? '#00ff00' : '#ffaa00')
                .setTitle(success ? '✅ Thành công' : '⚠️ Thông báo')
                .setDescription(success ? 
                    `Đã thêm ${targetUser.username} vào danh sách được phép sử dụng kho plugins!` :
                    `${targetUser.username} đã có quyền từ trước!`
                )
                .addFields(
                    { name: '👤 Người được thêm', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🔧 Được thêm bởi', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi thêm user:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi thêm người dùng!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};