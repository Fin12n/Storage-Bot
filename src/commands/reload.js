// src/commands/reload.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { REST, Routes } = require('discord.js');
const PermissionManager = require('../utils/permissions');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload tất cả commands và events của bot')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Loại reload')
                .setRequired(false)
                .addChoices(
                    { name: 'Commands', value: 'commands' },
                    { name: 'Events', value: 'events' },
                    { name: 'All (Commands + Events)', value: 'all' }
                )),

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

        const reloadType = interaction.options.getString('type') || 'all';
        
        await interaction.deferReply({ ephemeral: true });

        const statusEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🔄 Đang reload...')
            .setDescription(`Đang reload ${reloadType}...`)
            .setTimestamp();

        await interaction.editReply({ embeds: [statusEmbed] });

        let results = {
            commands: { success: 0, failed: 0, errors: [] },
            events: { success: 0, failed: 0, errors: [] }
        };

        try {
            if (reloadType === 'commands' || reloadType === 'all') {
                results.commands = await this.reloadCommands(interaction.client);
            }

            if (reloadType === 'events' || reloadType === 'all') {
                results.events = await this.reloadEvents(interaction.client);
            }

            // Create result embed
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Reload hoàn thành!')
                .setDescription(`Đã reload ${reloadType} thành công!`)
                .setTimestamp();

            let resultText = '';

            if (reloadType === 'commands' || reloadType === 'all') {
                resultText += `**📋 Commands:**\n`;
                resultText += `✅ Thành công: ${results.commands.success}\n`;
                if (results.commands.failed > 0) {
                    resultText += `❌ Thất bại: ${results.commands.failed}\n`;
                }
                resultText += '\n';
            }

            if (reloadType === 'events' || reloadType === 'all') {
                resultText += `**⚡ Events:**\n`;
                resultText += `✅ Thành công: ${results.events.success}\n`;
                if (results.events.failed > 0) {
                    resultText += `❌ Thất bại: ${results.events.failed}\n`;
                }
            }

            embed.addFields({ name: '📊 Kết quả', value: resultText, inline: false });

            // Add errors if any
            const allErrors = [...results.commands.errors, ...results.events.errors];
            if (allErrors.length > 0) {
                const errorText = allErrors.slice(0, 3).join('\n'); // Show max 3 errors
                embed.addFields({ 
                    name: '⚠️ Lỗi', 
                    value: errorText + (allErrors.length > 3 ? `\n... và ${allErrors.length - 3} lỗi khác` : ''), 
                    inline: false 
                });
                embed.setColor('#ffaa00'); // Warning color if there are errors
            }

            embed.addFields(
                { name: '👤 Reload bởi', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🕒 Thời gian', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Lỗi khi reload:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Lỗi reload')
                .setDescription('Có lỗi xảy ra khi reload!')
                .addFields(
                    { name: '🐛 Chi tiết', value: error.message || 'Unknown error', inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    },

    async reloadCommands(client) {
        const results = { success: 0, failed: 0, errors: [] };
        const commandsPath = path.join(__dirname, '..', 'commands');
        
        try {
            // Clear existing commands
            client.commands.clear();
            
            if (!fs.existsSync(commandsPath)) {
                throw new Error('Commands directory not found');
            }

            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            const commands = [];

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(commandsPath, file);
                    
                    // Clear require cache
                    delete require.cache[require.resolve(filePath)];
                    
                    const command = require(filePath);
                    
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                        commands.push(command.data.toJSON());
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push(`${file}: Missing required properties`);
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push(`${file}: ${error.message}`);
                }
            }

            // Deploy commands to Discord
            if (commands.length > 0) {
                const rest = new REST().setToken(process.env.BOT_TOKEN || 'BOT_TOKEN');
                
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commands },
                );
            }

        } catch (error) {
            results.errors.push(`Commands reload: ${error.message}`);
        }

        return results;
    },

    async reloadEvents(client) {
        const results = { success: 0, failed: 0, errors: [] };
        const eventsPath = path.join(__dirname, '..', 'events');
        
        try {
            // Remove existing event listeners
            client.removeAllListeners();
            
            if (!fs.existsSync(eventsPath)) {
                throw new Error('Events directory not found');
            }

            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

            for (const file of eventFiles) {
                try {
                    const filePath = path.join(eventsPath, file);
                    
                    // Clear require cache
                    delete require.cache[require.resolve(filePath)];
                    
                    const event = require(filePath);
                    
                    if (event.name && event.execute) {
                        if (event.once) {
                            client.once(event.name, (...args) => event.execute(...args));
                        } else {
                            client.on(event.name, (...args) => event.execute(...args));
                        }
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push(`${file}: Missing required properties`);
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push(`${file}: ${error.message}`);
                }
            }

        } catch (error) {
            results.errors.push(`Events reload: ${error.message}`);
        }

        return results;
    }
};