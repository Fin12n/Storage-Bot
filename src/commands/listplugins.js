// src/commands/listplugins.js
const { SlashCommandBuilder } = require('discord.js');
const pluginsCommand = require('./plugins');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplugins')
        .setDescription('Alias cho lệnh /plugins - Xem danh sách các plugins trong kho'),

    async execute(interaction) {
        // Delegate to plugins command
        await pluginsCommand.execute(interaction);
    },

    async handlePagination(interaction, page) {
        // Delegate to plugins command
        await pluginsCommand.handlePagination(interaction, page);
    },
};