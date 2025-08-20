const db = require('../database');

class PermissionManager {
    static async isAuthorized(userId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT user_id FROM authorized_users WHERE user_id = ?', [userId], (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            });
        });
    }

    static async addUser(userId, username, addedBy) {
        return new Promise((resolve, reject) => {
            db.run('INSERT OR REPLACE INTO authorized_users (user_id, username, added_by) VALUES (?, ?, ?)', 
                [userId, username, addedBy], function(err) {
                if (err) reject(err);
                resolve(this.changes > 0);
            });
        });
    }

    static async removeUser(userId) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM authorized_users WHERE user_id = ?', [userId], function(err) {
                if (err) reject(err);
                resolve(this.changes > 0);
            });
        });
    }

    static async getAuthorizedUsers() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM authorized_users ORDER BY added_at DESC', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });
    }
}

module.exports = PermissionManager;