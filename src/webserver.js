// src/webserver.js - Enhanced version
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const DownloadManager = require('./utils/downloads');
const PluginManager = require('./utils/plugins');
const PermissionManager = require('./utils/permissions');

const app = express();
const PORT = process.env.PORT || 6265;

// Configure session
app.use(session({
    secret: process.env.SESSION_SECRET || '_0d70bTIRnKC432VaQdVJVFV4sYERuGZPdAOq-59z5rvPwrbg1AdI4OB_Cb4iU7_hNzcX9JeoEtvJ9xjZsRSiEuP28KKSGC_hJvpJN5rkeVdcqTbkMOaLoDdMdq4bz35qZeIUjvyGVWjdzJFTruM49waPzkThpPBmokKx27bL9DH8JOb7UoYRTtsEHX-isKo43G4eP5Tj1I_626VHMll1AVvlrl9REHnG1wG7KTz3ejrNyihc_nI--VrNsnkMXmRS8Qu_Xt7TNaQJgw7ocGTN4jR_v6p2VV7ZFlKKFmoTG7x81SiatasqEpQmOypj4kxL6Gpcbkk5cxIU0pIBgy_',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Configure Passport
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID || '1344853747259543682',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '87nT6PvOTiqATXr29xj_qMGgcEi79DJp',
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
    const user = {
        id: profile.id,
        username: profile.username,
        avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
        isAuthorized: await PermissionManager.isAuthorized(profile.id)
    };
    return done(null, user);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter: (req, file, cb) => {
        if (file.originalname.toLowerCase().endsWith('.jar')) {
            cb(null, true);
        } else {
            cb(new Error('Only .jar files allowed'));
        }
    }
});

// Middleware to get client IP
app.use((req, res, next) => {
    req.clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
    next();
});

// Auth middleware
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/auth');
    }
};

const requirePermission = async (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAuthorized) {
        next();
    } else {
        res.status(403).json({ error: 'Không có quyền' });
    }
};

// Routes

// Main dashboard
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'auth.html'));
    }
});

// Auth routes
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/auth' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/auth');
    });
});

// API Routes

// Get current user
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Get stats
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const totalPlugins = await PluginManager.getTotalFolderCount();
        const totalFiles = await new Promise((resolve, reject) => {
            const db = require('./database');
            db.get('SELECT COUNT(*) as count FROM plugins', [], (err, row) => {
                if (err) reject(err);
                resolve(row?.count || 0);
            });
        });
        const totalSize = await new Promise((resolve, reject) => {
            const db = require('./database');
            db.get('SELECT SUM(file_size) as size FROM plugins', [], (err, row) => {
                if (err) reject(err);
                resolve(row?.size || 0);
            });
        });
        const totalDownloads = await new Promise((resolve, reject) => {
            const db = require('./database');
            db.get('SELECT SUM(download_count) as downloads FROM plugins', [], (err, row) => {
                if (err) reject(err);
                resolve(row?.downloads || 0);
            });
        });

        res.json({
            totalPlugins,
            totalFiles,
            totalSize,
            totalDownloads
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi lấy thống kê' });
    }
});

// Get plugins
app.get('/api/plugins', requireAuth, async (req, res) => {
    try {
        const plugins = await PluginManager.getPluginFolders(50, 0);
        res.json(plugins);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi lấy plugins' });
    }
});

// Get plugin details
app.get('/api/plugins/:folderName', requireAuth, async (req, res) => {
    try {
        const files = await PluginManager.getPluginFiles(req.params.folderName);
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi lấy chi tiết plugin' });
    }
});

// Upload plugin
app.post('/api/upload', requirePermission, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        const savedPlugin = await PluginManager.savePlugin(req.file, req.user.id);
        res.json({
            success: true,
            plugin: savedPlugin
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Lỗi khi upload' });
    }
});

// Create download link
app.post('/api/download', requirePermission, async (req, res) => {
    try {
        const { pluginId, maxDownloads = 10, expiresHours = 24, allowedIps } = req.body;
        
        const plugin = await PluginManager.getPluginById(pluginId);
        if (!plugin) {
            return res.status(404).json({ error: 'Plugin không tồn tại' });
        }

        const linkId = await DownloadManager.createDownloadLink(
            pluginId, maxDownloads, allowedIps, req.user.id, expiresHours
        );

        const downloadUrl = `${process.env.BASE_URL || `http://46.247.108.38:${PORT}`}/download/${linkId}`;
        
        res.json({
            success: true,
            linkId,
            downloadUrl,
            plugin,
            expiresAt: new Date(Date.now() + expiresHours * 60 * 60 * 1000)
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Lỗi khi tạo link tải' });
    }
});

// Reload plugins
app.post('/api/reload', requirePermission, async (req, res) => {
    try {
        const result = await PluginManager.scanAndSyncPlugins();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Lỗi khi reload' });
    }
});

// Download endpoint
app.get('/download/:linkId', async (req, res) => {
    try {
        const { linkId } = req.params;
        const clientIp = req.clientIp;

        const validation = await DownloadManager.validateDownload(linkId, clientIp);
        
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.reason
            });
        }

        const plugin = validation.plugin;
        
        if (!await fs.pathExists(plugin.file_path)) {
            return res.status(404).json({
                error: 'File không tồn tại trên server'
            });
        }

        await DownloadManager.incrementDownload(linkId);

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

// Plugin detail page
app.get('/plugin/:folderName', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'plugin-detail.html'));
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