const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
require('./src/database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'src', 'commands');

// Ensure commands directory exists
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Skipped ${file}: missing required properties`);
        }
    }
}

// Load events
const eventsPath = path.join(__dirname, 'src', 'events');

// Ensure events directory exists  
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`✅ Loaded event: ${event.name}`);
    }
}

// Start web server
require('./src/webserver');

// Replace with your actual bot token
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TOKEN_BOT_DISCORD';


client.login(BOT_TOKEN).catch(console.error);
