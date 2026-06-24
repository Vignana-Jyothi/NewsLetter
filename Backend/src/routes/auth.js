const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');

// GET /api/auth/profile — returns user profile based on the cookie
router.get('/profile', verifyToken, (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
