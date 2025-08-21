// src/commands/plugins.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const PluginManager = require('../utils/plugins');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plugins')
        .setDescription('Xem danh sách plugins (theo thư mục)'),

    async execute(interaction) {
        await this.showPluginsPage(interaction, 0);
    },

    async handlePagination(interaction, page) {
        await this.showPluginsPage(interaction, page, true);
    },

    async showPluginsPage(interaction, page = 0, isUpdate = false) {
        try {
            const limit = 10;
            const offset = page * limit;
            
            const [plugins, totalCount] = await Promise.all([
                PluginManager.getPluginFolders(limit, offset),
                PluginManager.getTotalFolderCount()
            ]);

            const totalPages = Math.ceil(totalCount / limit);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📦 Danh sách Plugins')
                .setDescription(`Tổng số plugin: **${totalCount}**\nTrang ${page + 1}/${totalPages}`)
                .setTimestamp();

            if (plugins.length > 0) {
                const pluginList = plugins.map(plugin => {
                    const sizeKB = (plugin.total_size / 1024).toFixed(2);
                    return `📁 **${plugin.folder_name}**\n` +
                           `📊 ${plugin.file_count} files • 💾 ${sizeKB} KB\n` +
                           `📅 <t:${Math.floor(new Date(plugin.last_updated).getTime() / 1000)}:R>`;
                }).join('\n\n');

                embed.addFields({
                    name: '📋 Plugins',
                    value: pluginList,
                    inline: false
                });
            } else {
                embed.setDescription('❌ Không có plugins nào trong kho!');
            }

            // Pagination buttons
            const row = new ActionRowBuilder();
            
            if (totalPages > 1) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`plugins_page_${Math.max(0, page - 1)}`)
                        .setLabel('◀️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    
                    new ButtonBuilder()
                        .setCustomId(`plugins_page_${Math.min(totalPages - 1, page + 1)}`)
                        .setLabel('▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                );
            }

            const response = {
                embeds: [embed],
                components: row.components.length > 0 ? [row] : []
            };

            if (isUpdate) {
                await interaction.update(response);
            } else {
                await interaction.reply(response);
            }
        } catch (error) {
            console.error('Lỗi khi lấy danh sách plugins:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi lấy danh sách plugins!')
                .setTimestamp();
            
            if (isUpdate) {
                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};