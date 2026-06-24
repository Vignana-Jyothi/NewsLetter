const express = require('express');
const router = express.Router();
const { mockAuth } = require('../middlewares/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

router.use(mockAuth);

router.get('/', getNotifications);
// IMPORTANT: /read-all must come BEFORE /:id/read — otherwise Express treats
// "read-all" as the :id parameter and the markAllAsRead handler is never reached.
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;

