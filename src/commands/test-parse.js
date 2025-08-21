// src/commands/test-parse.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PluginManager = require('../utils/plugins');
const PermissionManager = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-parse')
        .setDescription('Test việc phân tích tên file plugin')
        .addStringOption(option =>
            option.setName('filename')
                .setDescription('Tên file cần test (ví dụ: ExamplePlugins-1.0.0.jar)')
                .setRequired(true)),

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

        const filename = interaction.options.getString('filename');
        
        try {
            // Test parsing
            const result = PluginManager.parsePluginName(filename);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🧪 Kết quả phân tích tên file')
                .setDescription(`Phân tích file: **${filename}**`)
                .addFields(
                    { name: '📁 File gốc', value: filename, inline: false },
                    { name: '🏷️ Plugin Name', value: result.name, inline: true },
                    { name: '📊 Version', value: result.version, inline: true },
                    { name: '📂 Folder Name', value: result.folderName, inline: true },
                    { name: '🗂️ Đường dẫn sẽ tạo', value: `plugins/${result.folderName}/`, inline: false },
                    { name: '📁 File sẽ lưu', value: `${result.folderName}-${result.version}.jar`, inline: false }
                )
                .setFooter({ text: 'Đây là test - không upload file thật' })
                .setTimestamp();

            // Test multiple filename patterns
            const testCases = [
                'ExamplePlugins-1.0.0.jar',
                'Example-Plugins-v2.1.3.jar',
                'MyPlugin_1.5.jar',
                'TestPluginv1.0.0.jar',
                'SimplePlugin-SNAPSHOT.jar',
                'CoreProtect-21.2.jar',
                'worldedit-bukkit-7.2.15.jar',
                'EssentialsX-2.19.7.jar'
            ];
            
            if (testCases.includes(filename)) {
                const allResults = testCases.map(testFile => {
                    const testResult = PluginManager.parsePluginName(testFile);
                    return `**${testFile}**\n├ Plugin: ${testResult.name}\n├ Version: ${testResult.version}\n└ Folder: ${testResult.folderName}`;
                }).join('\n\n');
                
                embed.addFields({
                    name: '📝 Ví dụ phân tích khác',
                    value: allResults,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi test parse:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi')
                .setDescription('Có lỗi xảy ra khi phân tích tên file!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};