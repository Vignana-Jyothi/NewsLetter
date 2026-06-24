const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middlewares/errorHandler');
const cookieParser = require('cookie-parser');

const authRoutes         = require('./routes/auth');
const submissionRoutes   = require('./routes/submissions');
const approvalRoutes     = require('./routes/approvals');
const newsletterRoutes   = require('./routes/newsletters');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ── Security Headers (helmet) ──
app.use(helmet());

// ── Rate Limiting ── 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', limiter);

// ── Middleware ──
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));


// ── Static Files (uploaded proofs & generated PDFs) ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ──
app.use('/api/auth',          authRoutes);
app.use('/api/submissions',   submissionRoutes);
app.use('/api/approvals',     approvalRoutes);
app.use('/api/newsletters',   newsletterRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'NEWSFLOW Backend is running ✅' });
});

// ── Global Error Handler (must be last) ──
app.use(errorHandler);

module.exports = app;
