// src/commands/versions.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const PluginManager = require('../utils/plugins');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('versions')
        .setDescription('Xem các phiên bản của một plugin')
        .addStringOption(option =>
            option.setName('plugin')
                .setDescription('Tên plugin cần xem phiên bản')
                .setRequired(true)),

    async execute(interaction) {
        const pluginName = interaction.options.getString('plugin');
        await this.showVersionsPage(interaction, pluginName, 0);
    },

    async handlePagination(interaction, pluginName, page) {
        await this.showVersionsPage(interaction, pluginName, page, true);
    },

    async showVersionsPage(interaction, pluginName, page = 0, isUpdate = false) {
        try {
            const versions = await PluginManager.getPluginVersions(pluginName);
            
            if (versions.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Không tìm thấy')
                    .setDescription(`Không tìm thấy plugin với tên: **${pluginName}**`)
                    .setTimestamp();
                
                const response = { embeds: [embed], ephemeral: true };
                if (isUpdate) {
                    await interaction.update(response);
                } else {
                    await interaction.reply(response);
                }
                return;
            }

            const limit = 10;
            const offset = page * limit;
            const paginatedVersions = versions.slice(offset, offset + limit);
            const totalPages = Math.ceil(versions.length / limit);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🏷️ Phiên bản của ${pluginName}`)
                .setDescription(`Hiển thị ${paginatedVersions.length}/${versions.length} phiên bản (Trang ${page + 1}/${totalPages})`)
                .setTimestamp();

            const versionList = paginatedVersions.map((version, index) => {
                const globalIndex = offset + index + 1;
                return `**${globalIndex}. ${version.full_name}**\n` +
                       `🏷️ Phiên bản: \`${version.version}\`\n` +
                       `💾 Kích thước: ${(version.file_size / 1024).toFixed(2)} KB\n` +
                       `👤 Upload bởi: <@${version.uploaded_by}>\n` +
                       `📅 Ngày upload: <t:${Math.floor(new Date(version.upload_date).getTime() / 1000)}:F>\n` +
                       `📥 Lượt tải: ${version.download_count}`;
            }).join('\n\n');

            embed.addFields({ 
                name: '📋 Danh sách phiên bản', 
                value: versionList,
                inline: false 
            });

            // Create pagination buttons
            const row = new ActionRowBuilder();
            
            if (totalPages > 1) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`versions_page_${Math.max(0, page - 1)}_${pluginName}`)
                        .setLabel('◀️ Trước')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    
                    new ButtonBuilder()
                        .setCustomId(`versions_page_${Math.min(totalPages - 1, page + 1)}_${pluginName}`)
                        .setLabel('Sau ▶️')
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
            console.error('Lỗi khi lấy phiên bản plugin:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi lấy phiên bản plugin!')
                .setTimestamp();
            
            if (isUpdate) {
                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};
