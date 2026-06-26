const express = require('express');
const router = express.Router();
const { mockAuth, requireRole } = require('../middlewares/auth');
const upload = require('../config/multer');
const {
  createSubmission,
  updateSubmission,
  submitForApproval,
  reopenSubmission,
  getMySubmissions,
  getSubmissionById,
  getPendingSubmissions,
  getApprovedSubmissions,
} = require('../controllers/submissionController');

// All routes require mock auth
router.use(mockAuth);

// Student / Faculty routes
router.post('/', upload.array('files', 5), createSubmission);
router.put('/:id', updateSubmission);
router.patch('/:id/submit', submitForApproval);
router.patch('/:id/reopen', reopenSubmission);   // reopen Rejected → Draft
router.get('/mine', getMySubmissions);
router.get('/:id', getSubmissionById);

// Admin-only routes
router.get('/admin/pending', requireRole('Admin'), getPendingSubmissions);
router.get('/admin/approved', requireRole('Admin'), getApprovedSubmissions);

module.exports = router;
