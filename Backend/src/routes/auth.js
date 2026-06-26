const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { devLogin, devLogout } = require('../controllers/authController');

// GET /api/auth/profile — returns user profile based on the active session cookie
router.get('/profile', verifyToken, (req, res) => {
  res.json({ success: true, data: req.user });
});

// ─────────────────────────────────────────────
// DEV-ONLY endpoints (no-op / 403 when DEV_MODE=false)
// ─────────────────────────────────────────────

// POST /api/auth/dev-login  — body: { email }
router.post('/dev-login', devLogin);

// POST /api/auth/dev-logout — clears devSession cookie
router.post('/dev-logout', devLogout);

module.exports = router;
