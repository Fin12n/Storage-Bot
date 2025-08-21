// src/utils/plugins.js
const db = require('../database');
const path = require('path');
const fs = require('fs-extra');

class PluginManager {
    static parsePluginName(filename) {
        const name = path.parse(filename).name;
        const match = name.match(/^(.+?)[-_]?(\d+\.\d+\.\d+)$/);
        
        if (match) {
            let pluginName = match[1];
            const version = match[2];
            pluginName = pluginName.replace(/([a-z])([A-Z])/g, '$1-$2');
            
            return {
                name: pluginName,
                version: version,
                folderName: pluginName
            };
        }
        
        return {
            name: name,
            version: '1.0.0',
            folderName: name
        };
    }

    static async savePlugin(file, uploadedBy) {
        const { name, version, folderName } = this.parsePluginName(file.originalname);
        const pluginDir = path.join(__dirname, '..', '..', 'plugins', folderName);
        
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
    }err) {
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

    // NEW: Get plugin folders with stats
    static async getPluginFolders(limit = 10, offset = 0) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT folder_name, 
                    COUNT(*) as file_count,
                    SUM(file_size) as total_size,
                    MAX(upload_date) as last_updated
                    FROM plugins 
                    GROUP BY folder_name 
                    ORDER BY last_updated DESC 
                    LIMIT ? OFFSET ?`, 
                [limit, offset], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }

    // NEW: Get total folder count
    static async getTotalFolderCount() {
        return new Promise((resolve, reject) => {
            db.get('SELECT COUNT(DISTINCT folder_name) as count FROM plugins', [], (err, row) => {
                if (err) reject(err);
                resolve(row?.count || 0);
            });
        });
    }

    // NEW: Get files in specific folder
    static async getPluginFiles(folderName) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM plugins WHERE folder_name = ? ORDER BY upload_date DESC`, 
                [folderName], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }

    // NEW: Scan and sync plugins from file system
    static async scanAndSyncPlugins() {
        const pluginsDir = path.join(__dirname, '..', '..', 'plugins');
        let scannedFolders = 0;
        let foundPlugins = 0;
        let newPlugins = 0;
        let errors = [];

        try {
            if (!await fs.pathExists(pluginsDir)) {
                await fs.ensureDir(pluginsDir);
            }

            const folders = await fs.readdir(pluginsDir);
            scannedFolders = folders.length;

            for (const folder of folders) {
                const folderPath = path.join(pluginsDir, folder);
                const stat = await fs.stat(folderPath);
                
                if (stat.isDirectory()) {
                    try {
                        const files = await fs.readdir(folderPath);
                        const jarFiles = files.filter(f => f.endsWith('.jar'));
                        foundPlugins += jarFiles.length;

                        for (const jarFile of jarFiles) {
                            const filePath = path.join(folderPath, jarFile);
                            const fileStats = await fs.stat(filePath);
                            
                            // Check if plugin already exists
                            const exists = await new Promise((resolve) => {
                                db.get('SELECT id FROM plugins WHERE file_path = ?', [filePath], (err, row) => {
                                    resolve(!!row);
                                });
                            });

                            if (!exists) {
                                const { name, version } = this.parsePluginName(jarFile);
                                
                                await new Promise((resolve, reject) => {
                                    db.run(`INSERT INTO plugins 
                                        (name, version, full_name, folder_name, file_path, file_size, uploaded_by) 
                                        VALUES (?, ?, ?, ?, ?, ?, 'SYSTEM')`,
                                        [name, version, jarFile, folder, filePath, fileStats.size],
                                        function(err) {
                                            if (err) reject(err);
                                            else resolve();
                                        });
                                });
                                
                                newPlugins++;
                            }
                        }
                    } catch (error) {
                        errors.push(`Lỗi folder ${folder}: ${error.message}`);
                    }
                }
            }

            const totalPlugins = await this.getTotalPluginCount();

            return {
                scannedFolders,
                foundPlugins,
                newPlugins,
                totalPlugins,
                errors
            };
        } catch (error) {
            errors.push(`Lỗi scan: ${error.message}`);
            return { scannedFolders: 0, foundPlugins: 0, newPlugins: 0, totalPlugins: 0, errors };
        }
    }

    // Keep existing methods for backward compatibility
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