const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const DownloadManager = require('./utils/downloads');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to get client IP
app.use((req, res, next) => {
    req.clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
    next();
});

// Download endpoint
app.get('/download/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;
        const clientIp = req.clientIp;

        // Validate download
        const validation = await DownloadManager.validateDownload(linkId, clientIp);
        
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.reason
            });
        }

        const plugin = validation.plugin;
        
        // Check if file exists
        if (!await fs.pathExists(plugin.file_path)) {
            return res.status(404).json({
                error: 'File không tồn tại trên server'
            });
        }

        // Increment download counter
        await DownloadManager.incrementDownload(linkId);

        // Send file
        res.download(plugin.file_path, plugin.full_name, (err) => {
            if (err) {
                console.error('Lỗi khi gửi file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Lỗi khi tải file' });
                }
            }
        });

    } catch (error) {
        console.error('Lỗi download endpoint:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint không tồn tại' });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server đang chạy trên port ${PORT}`);
});

module.exports = app;