const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

// Ensure database directory exists
fs.ensureDirSync(path.join(__dirname, '..', 'data'));

const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'plugins.db'));

// Initialize database tables
db.serialize(() => {
    // Users with permissions
    db.run(`CREATE TABLE IF NOT EXISTS authorized_users (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        added_by TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Plugins
    db.run(`CREATE TABLE IF NOT EXISTS plugins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        full_name TEXT NOT NULL,
        folder_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        uploaded_by TEXT NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        download_count INTEGER DEFAULT 0
    )`);

    // Download links
    db.run(`CREATE TABLE IF NOT EXISTS download_links (
        id TEXT PRIMARY KEY,
        plugin_id INTEGER,
        max_downloads INTEGER DEFAULT 10,
        current_downloads INTEGER DEFAULT 0,
        allowed_ips TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (plugin_id) REFERENCES plugins (id)
    )`);
});

module.exports = db;