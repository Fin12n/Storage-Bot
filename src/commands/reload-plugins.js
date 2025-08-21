// src/commands/reload-plugins.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PluginManager = require('../utils/plugins');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload-plugins')
        .setDescription('Reload danh sách plugins từ thư mục'),

    async execute(interaction) {
        const isAuthorized = await PermissionManager.isAuthorized(interaction.user.id);
        
        if (!isAuthorized) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Không có quyền')
                .setDescription('Bạn không có quyền reload plugins!')
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const result = await PluginManager.scanAndSyncPlugins();
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔄 Reload hoàn tất!')
                .setDescription('Đã quét và đồng bộ plugins từ thư mục!')
                .addFields(
                    { name: '📁 Thư mục đã quét', value: result.scannedFolders.toString(), inline: true },
                    { name: '📦 Plugins tìm thấy', value: result.foundPlugins.toString(), inline: true },
                    { name: '➕ Plugins mới', value: result.newPlugins.toString(), inline: true },
                    { name: '🗂️ Tổng plugins', value: result.totalPlugins.toString(), inline: true }
                )
                .setTimestamp();

            if (result.errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Lỗi',
                    value: result.errors.slice(0, 3).join('\n'),
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi reload:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi reload plugins!')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    },
};