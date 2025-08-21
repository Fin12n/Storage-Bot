const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class DownloadManager {
    static async createDownloadLink(pluginId, maxDownloads = 10, allowedIps = null, createdBy, expiresInHours = 24) {
        const linkId = uuidv4();
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO download_links 
                (id, plugin_id, max_downloads, allowed_ips, created_by, expires_at) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [linkId, pluginId, maxDownloads, allowedIps, createdBy, expiresAt],
                function(err) {
                    if (err) reject(err);
                    resolve(linkId);
                });
        });
    }

    static async validateDownload(linkId, ip) {
        return new Promise((resolve, reject) => {
            db.get(`SELECT dl.*, p.* FROM download_links dl 
                    JOIN plugins p ON dl.plugin_id = p.id 
                    WHERE dl.id = ?`, [linkId], (err, row) => {
                if (err) reject(err);
                
                if (!row) {
                    resolve({ valid: false, reason: 'Link không tồn tại' });
                    return;
                }
                
                // Check expiration
                if (new Date() > new Date(row.expires_at)) {
                    resolve({ valid: false, reason: 'Link đã hết hạn' });
                    return;
                }
                
                // Check download limit
                if (row.current_downloads >= row.max_downloads) {
                    resolve({ valid: false, reason: 'Đã hết lượt tải' });
                    return;
                }
                
                // Check IP restriction
                if (row.allowed_ips && !row.allowed_ips.includes(ip)) {
                    resolve({ valid: false, reason: 'IP không được phép' });
                    return;
                }
                
                resolve({ valid: true, plugin: row });
            });
        });
    }

    static async incrementDownload(linkId) {
        return new Promise((resolve, reject) => {
            db.run('UPDATE download_links SET current_downloads = current_downloads + 1 WHERE id = ?',
                [linkId], function(err) {
                if (err) reject(err);
                resolve(this.changes > 0);
            });
        });
    }
}

module.exports = DownloadManager;