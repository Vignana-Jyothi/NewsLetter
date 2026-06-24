const axios = require('axios');
const pool = require('../config/db');

const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3115';

// Simple in-memory cache: token -> { user, expiresAt }
// Reduces round-trips to the central auth server on every request
const tokenCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Determine role from email domain — Faculty/Staff get Admin privileges
// Students have 'stu' in their email domain (e.g. @stu.vnrvjiet.in)
const getRoleFromEmail = (email) => {
  const e = email.toLowerCase();
  return e.includes('stu') ? 'Student' : 'Admin';
};

// Look up local user record by email to get department_id and other DB fields.
// This bridges the SSO identity (email/name/picture from auth server)
// with the local Users table that stores department assignments.
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
    // If DB lookup fails, proceed without department info — don't block the request
    console.error('[Auth] Local user lookup failed:', err.message);
    return null;
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.userToken;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }

    // Basic sanity check — JWTs have exactly 3 dot-separated parts
    if (token.split('.').length !== 3) {
      return res.status(401).json({ error: 'Malformed token.' });
    }

    // Check cache first
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    // Verify with central auth server (with a 5s timeout)
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
      // 401/403 from auth server => our token is invalid
      return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
    }

    if (!response.data || !response.data.user) {
      return res.status(401).json({ error: 'Invalid token response.' });
    }

    const authUser = response.data.user;

    // Look up the user in the local DB by email to get department_id.
    // Per Explanation.md: auth server provides identity (email/name/picture);
    // local DB provides app-specific data (department, role assignment).
    const localUser = await getLocalUserByEmail(authUser.email);

    const role = localUser?.role || getRoleFromEmail(authUser.email);

    const user = {
      id: localUser?.id || authUser.id || authUser.email,
      email: authUser.email,
      name: authUser.name || localUser?.name,
      picture: authUser.picture,
      role,
      department_name: localUser?.department_name || 'General',
      department_id: localUser?.department_id || null,
    };

    // Store in cache
    tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });

    req.user = user;
    next();
  } catch (error) {
    // Don't leak internal errors to the client
    console.error('[Auth] verifyToken error:', error.message);
    res.status(500).json({ error: 'Internal authentication error.' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Export mockAuth as alias so existing routes continue to work
module.exports = { mockAuth: verifyToken, verifyToken, requireRole };

