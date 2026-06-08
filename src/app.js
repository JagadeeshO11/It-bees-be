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
 * The browser sends the `Origin` header WITHOUT a trailing slash,
 * e.g. "https://itbeesglobal.com". If FRONTEND_URL is set with a
 * trailing slash (very easy to do by accident) the strict-equality
 * CORS check will silently reject every preflight.
 *
 * To make this rock-solid we:
 *   1. Normalize every URL (strip trailing slashes, lowercase).
 *   2. ALSO check a regex pattern for the production domain
 *      ("itbeesglobal.com" with optional "www." prefix). This means
 *      even if the Vercel env var is set wrong, requests from
 *      https://itbeesglobal.com and https://www.itbeesglobal.com
 *      will still be allowed.
 * ============================================================ */

const normalizeOrigin = (url) => {
    if (!url) return url;
    return String(url).trim().replace(/\/+$/, '').toLowerCase();
};

// Extra patterns for known production domains (in addition to FRONTEND_URL).
// The pattern is a RegExp; it is matched against the normalized origin.
const ORIGIN_PATTERNS = [
    /^https?:\/\/(www\.)?itbeesglobal\.com$/i,
    /^https?:\/\/(www\.)?it-bees-global\.com$/i,
    /^https?:\/\/it-bees-be\.vercel\.app$/i, // allow the API's own origin (useful for server-to-server smoke tests)
];

const allowedExactOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
]
    .filter(Boolean)
    .map(normalizeOrigin);

const isOriginAllowed = (rawOrigin) => {
    if (!rawOrigin) return true; // non-browser / curl / server-to-server
    const origin = normalizeOrigin(rawOrigin);
    if (allowedExactOrigins.includes(origin)) return true;
    return ORIGIN_PATTERNS.some((re) => re.test(origin));
};

// Security Middleware
app.use(helmet());

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // cache preflight for 24h
}));

// Explicitly answer preflight requests (some browsers need this in addition to cors()).
app.options('*', cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File Uploads
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit (templates up to 20MB, images validated per-controller)
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
