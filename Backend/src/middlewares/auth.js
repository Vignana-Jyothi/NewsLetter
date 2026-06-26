const axios = require('axios');
const pool = require('../config/db');

const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3115';
const IS_DEV_MODE = process.env.DEV_MODE === 'true';

// ── In-memory caches (avoid DB/auth-server round-trips on every request) ──
const tokenCache   = new Map(); // SSO token  → { user, expiresAt }
const devCache     = new Map(); // email      → { user, expiresAt }
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const getRoleFromEmail = (email) => {
  const e = email.toLowerCase();
  return e.includes('stu') ? 'Student' : 'Admin';
};

const getLocalUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name AS department_name
       FROM Users u
       LEFT JOIN Departments d ON d.id = u.department_id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Auth] Local user lookup failed:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────
// DEV MODE: Read devSession cookie — with in-memory caching
// ─────────────────────────────────────────────
const verifyDevSession = async (req, res, next) => {
  const raw = req.cookies.devSession;
  if (!raw) return res.status(401).json({ error: 'Unauthorized. Please login.' });

  let session;
  try { session = JSON.parse(raw); } catch {
    return res.status(401).json({ error: 'Malformed dev session.' });
  }

  if (!session.userId || !session.email) {
    return res.status(401).json({ error: 'Invalid dev session.' });
  }

  // Check cache first — avoids a DB hit on every authenticated request
  const cached = devCache.get(session.email);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  const localUser = await getLocalUserByEmail(session.email);
  if (!localUser) {
    return res.status(401).json({ error: 'Dev user not found in database.' });
  }

  const user = {
    id:              localUser.id,
    email:           localUser.email,
    name:            localUser.name,
    picture:         null,
    role:            localUser.role,
    department_name: localUser.department_name || 'General',
    department_id:   localUser.department_id || null,
  };

  devCache.set(session.email, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  req.user = user;
  return next();
};

// ─────────────────────────────────────────────
// PRODUCTION: Verify JWT via central auth server
// ─────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  if (IS_DEV_MODE && req.cookies.devSession) {
    return verifyDevSession(req, res, next);
  }

  try {
    const token = req.cookies.userToken;
    if (!token) return res.status(401).json({ error: 'Unauthorized. Please login.' });
    if (token.split('.').length !== 3) return res.status(401).json({ error: 'Malformed token.' });

    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    let response;
    try {
      response = await axios.get(`${AUTH_URL}/verify-token`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
    } catch (axiosErr) {
      if (axiosErr.code === 'ECONNABORTED') {
        return res.status(503).json({ error: 'Auth service timeout. Try again.' });
      }
      return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
    }

    if (!response.data?.user) return res.status(401).json({ error: 'Invalid token response.' });

    const authUser   = response.data.user;
    const localUser  = await getLocalUserByEmail(authUser.email);
    const role       = localUser?.role || getRoleFromEmail(authUser.email);

    const user = {
      id:              localUser?.id || authUser.email,
      email:           authUser.email,
      name:            authUser.name || localUser?.name,
      picture:         authUser.picture,
      role,
      department_name: localUser?.department_name || 'General',
      department_id:   localUser?.department_id   || null,
    };

    tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] verifyToken error:', error.message);
    res.status(500).json({ error: 'Internal authentication error.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  }
  next();
};

module.exports = { mockAuth: verifyToken, verifyToken, requireRole };
