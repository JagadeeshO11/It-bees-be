require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const path = require('path');
const errorHandler = require('./middleware/error');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

/* ============================================================
 * CORS CONFIGURATION
 * ============================================================
 * The browser sends the `Origin` header WITHOUT a trailing slash.
 * We normalize both sides to prevent footgun mismatches and also
 * check a regex pattern for known production domains.
 * ============================================================ */

const normalizeOrigin = (url) => {
    if (!url) return url;
    return String(url).trim().replace(/\/+$/, '').toLowerCase();
};

const ORIGIN_PATTERNS = [
    /^https?:\/\/([a-z0-9-]+\.)*itbeesglobal\.com$/i,
    /^https?:\/\/([a-z0-9-]+\.)*it-bees-global\.com$/i,
    /^https?:\/\/it-bees-be\.vercel\.app$/i,
];

const allowedExactOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
]
    .filter(Boolean)
    .map(normalizeOrigin);

const isOriginAllowed = (rawOrigin) => {
    if (!rawOrigin) return true;
    const origin = normalizeOrigin(rawOrigin);
    if (allowedExactOrigins.includes(origin)) return true;
    return ORIGIN_PATTERNS.some((re) => re.test(origin));
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'X-CSRF-Token', 'X-Api-Key'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
};

// Security Middleware
app.use(helmet());

app.use(cors(corsOptions));
app.options(/^\/api\/.*/, cors(corsOptions));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept, X-CSRF-Token, X-Api-Key');
        res.header('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
    }
    next();
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File Uploads
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 20 * 1024 * 1024 },
    abortOnLimit: true
}));

// Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;