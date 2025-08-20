// init-admin.js - Script để thêm admin đầu tiên
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

// Ensure database directory exists
fs.ensureDirSync(path.join(__dirname, 'data'));

const db = new sqlite3.Database(path.join(__dirname, 'data', 'plugins.db'));

// Thay YOUR_DISCORD_USER_ID bằng Discord User ID của bạn
const ADMIN_USER_ID = '958254424231378964'; // Ví dụ: '1234567890123456789'
const ADMIN_USERNAME = 'quang1807'; // Tên Discord của bạn

console.log('🔧 Đang khởi tạo admin đầu tiên...');

db.serialize(() => {
    // Tạo bảng nếu chưa có
    db.run(`CREATE TABLE IF NOT EXISTS authorized_users (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        added_by TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Thêm admin đầu tiên
    db.run(`INSERT OR REPLACE INTO authorized_users (user_id, username, added_by) 
            VALUES (?, ?, 'SYSTEM')`, 
        [ADMIN_USER_ID, ADMIN_USERNAME], 
        function(err) {
            if (err) {
                console.error('❌ Lỗi khi thêm admin:', err);
            } else {
                console.log('✅ Đã thêm admin thành công!');
                console.log(`👤 User ID: ${ADMIN_USER_ID}`);
                console.log(`📝 Username: ${ADMIN_USERNAME}`);
                console.log('\n🎉 Bây giờ bạn có thể sử dụng tất cả lệnh của bot!');
            }
            
            // Hiển thị danh sách users hiện tại
            db.all('SELECT * FROM authorized_users', [], (err, rows) => {
                if (err) {
                    console.error('❌ Lỗi khi lấy danh sách:', err);
                } else {
                    console.log('\n📋 Danh sách users có quyền:');
                    rows.forEach((row, index) => {
                        console.log(`${index + 1}. ${row.username} (${row.user_id}) - Added by: ${row.added_by}`);
                    });
                }
                db.close();
            });
        });
});