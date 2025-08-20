// src/utils/plugins.js
const db = require('../database');
const path = require('path');
const fs = require('fs-extra');

class PluginManager {
    static parsePluginName(filename) {
        // Remove file extension
        const name = path.parse(filename).name;
        
        // Match patterns like "Example-Plugins-1.0.0" or "ExamplePlugins-1.0.0"
        const match = name.match(/^(.+?)[-_]?(\d+\.\d+\.\d+)$/);
        
        if (match) {
            let pluginName = match[1];
            const version = match[2];
            
            // Convert camelCase to kebab-case and ensure proper format
            pluginName = pluginName.replace(/([a-z])([A-Z])/g, '$1-$2');
            
            return {
                name: pluginName,
                version: version,
                folderName: pluginName
            };
        }
        
        // Fallback for files without version
        return {
            name: name,
            version: '1.0.0',
            folderName: name
        };
    }

    static async savePlugin(file, uploadedBy) {
        const { name, version, folderName } = this.parsePluginName(file.originalname);
        const pluginDir = path.join(__dirname, '..', '..', 'plugins', folderName);
        
        // Ensure plugin directory exists
        await fs.ensureDir(pluginDir);
        
        const filePath = path.join(pluginDir, file.originalname);
        await fs.writeFile(filePath, file.buffer);
        
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`INSERT INTO plugins 
                (name, version, full_name, folder_name, file_path, file_size, uploaded_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`);
            
            stmt.run([name, version, file.originalname, folderName, filePath, file.size, uploadedBy], 
                function(err) {
                if (err) reject(err);
                resolve({
                    id: this.lastID,
                    name,
                    version,
                    fullName: file.originalname,
                    folderName,
                    filePath,
                    fileSize: file.size
                });
            });
        });
    }

    static async getPlugins(limit = 10, offset = 0) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT DISTINCT name, folder_name, COUNT(*) as version_count,
                    GROUP_CONCAT(version) as versions,
                    MAX(upload_date) as last_updated
                    FROM plugins 
                    GROUP BY name 
                    ORDER BY last_updated DESC 
                    LIMIT ? OFFSET ?`, 
                [limit, offset], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }

    static async getPluginVersions(pluginName) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM plugins WHERE name = ? ORDER BY upload_date DESC`, 
                [pluginName], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }

    static async getTotalPluginCount() {
        return new Promise((resolve, reject) => {
            db.get('SELECT COUNT(DISTINCT name) as count FROM plugins', [], (err, row) => {
                if (err) reject(err);
                resolve(row?.count || 0);
            });
        });
    }

    static async getPluginById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM plugins WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }
}

module.exports = PluginManager;