const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Bot đã sẵn sàng! Đăng nhập với tài khoản ${client.user.tag}`);
        console.log(`🔗 Web server đang chạy tại: http://localhost:3000`);
    },
};