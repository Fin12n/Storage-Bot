// src/commands/versions.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const PluginManager = require('../utils/plugins');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('versions')
        .setDescription('Xem các file trong thư mục plugin')
        .addStringOption(option =>
            option.setName('folder')
                .setDescription('Tên thư mục plugin')
                .setRequired(true)),

    async execute(interaction) {
        const folderName = interaction.options.getString('folder');
        await this.showVersionsPage(interaction, folderName, 0);
    },

    async handlePagination(interaction, folderName, page) {
        await this.showVersionsPage(interaction, folderName, page, true);
    },

    async showVersionsPage(interaction, folderName, page = 0, isUpdate = false) {
        try {
            const files = await PluginManager.getPluginFiles(folderName);
            
            if (files.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Không tìm thấy')
                    .setDescription(`Không tìm thấy thư mục: **${folderName}**`)
                    .setTimestamp();
                
                const response = { embeds: [embed], ephemeral: true };
                if (isUpdate) {
                    await interaction.update(response);
                } else {
                    await interaction.reply(response);
                }
                return;
            }

            const limit = 8;
            const offset = page * limit;
            const paginatedFiles = files.slice(offset, offset + limit);
            const totalPages = Math.ceil(files.length / limit);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📁 ${folderName}`)
                .setDescription(`${files.length} files • Trang ${page + 1}/${totalPages}`)
                .setTimestamp();

            const fileList = paginatedFiles.map((file, index) => {
                const globalIndex = offset + index + 1;
                const sizeKB = (file.file_size / 1024).toFixed(2);
                return `**${globalIndex}.** \`${file.full_name}\`\n` +
                       `💾 ${sizeKB} KB • 📥 ${file.download_count} downloads\n` +
                       `🆔 ID: ${file.id} • <t:${Math.floor(new Date(file.upload_date).getTime() / 1000)}:R>`;
            }).join('\n\n');

            embed.addFields({
                name: '📋 Files',
                value: fileList,
                inline: false
            });

            // Pagination buttons
            const row = new ActionRowBuilder();
            
            if (totalPages > 1) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`versions_page_${Math.max(0, page - 1)}_${folderName}`)
                        .setLabel('◀️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    
                    new ButtonBuilder()
                        .setCustomId(`versions_page_${Math.min(totalPages - 1, page + 1)}_${folderName}`)
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
            console.error('Lỗi khi lấy files:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi lấy danh sách files!')
                .setTimestamp();
            
            if (isUpdate) {
                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};