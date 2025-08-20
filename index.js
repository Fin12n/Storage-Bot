const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
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

// Function to deploy commands
async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.log('❌ Commands directory not found');
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }

    if (commands.length === 0) {
        console.log('❌ No commands to deploy');
        return;
    }

    const rest = new REST().setToken(BOT_TOKEN);

    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);
        console.log('🔑 Using token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 50) + '...' : 'NOT_SET');
        console.log('🆔 Client ID:', client.user.id);

        // Deploy commands globally
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

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

// Auto-deploy commands when bot is ready
client.once('ready', async () => {
    console.log(`✅ Bot đã sẵn sàng! Đăng nhập với tài khoản ${client.user.tag}`);
    console.log(`🆔 Client ID: ${client.user.id}`);
    console.log(`🏠 Servers: ${client.guilds.cache.size}`);
    
    // Auto-deploy commands
    await deployCommands();
});

// Start web server
require('./src/webserver');

// Replace with your actual bot token
const BOT_TOKEN = process.env.BOT_TOKEN || 'BOT_TOKEN';

// Debug token
console.log('🔑 Bot Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 50) + '...' : 'NOT_SET');

client.login(BOT_TOKEN).catch(console.error);
