const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ Không tìm thấy lệnh ${interaction.commandName}.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`❌ Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);
                
                const errorMessage = {
                    content: '❌ Có lỗi xảy ra khi thực thi lệnh này!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        } else if (interaction.isAutocomplete()) {
            // Handle autocomplete interactions
            const command = interaction.client.commands.get(interaction.commandName);
            
            if (!command || !command.autocomplete) {
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`❌ Lỗi autocomplete cho ${interaction.commandName}:`, error);
            }
        } else if (interaction.isButton()) {
            // Handle button interactions for pagination
            if (interaction.customId.startsWith('plugins_page_')) {
                const page = parseInt(interaction.customId.split('_')[2]);
                const pluginsCommand = interaction.client.commands.get('plugins');
                const listpluginsCommand = interaction.client.commands.get('listplugins');
                
                if (pluginsCommand && pluginsCommand.handlePagination) {
                    await pluginsCommand.handlePagination(interaction, page);
                } else if (listpluginsCommand && listpluginsCommand.handlePagination) {
                    await listpluginsCommand.handlePagination(interaction, page);
                }
            } else if (interaction.customId.startsWith('versions_page_')) {
                const data = interaction.customId.split('_');
                const page = parseInt(data[2]);
                const pluginName = data.slice(3).join('_');
                const versionsCommand = interaction.client.commands.get('versions');
                
                if (versionsCommand && versionsCommand.handlePagination) {
                    await versionsCommand.handlePagination(interaction, pluginName, page);
                }
            }
            // Ignore disabled buttons (current_page indicators)
            else if (interaction.customId.includes('current_page')) {
                return;
            }
        }
    },
};