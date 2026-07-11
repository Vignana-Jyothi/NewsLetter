const express = require('express');
const router = express.Router();
const { mockAuth, requireRole } = require('../middlewares/auth');
const {
  createNewsletter,
  getMyNewsletters,
  getNewsletterById,
  getNewsletterItems,
  addItem,
  removeItem,
  generatePDF,
  regeneratePDF,
  publishNewsletter,
  archiveNewsletter,
  getArchives,
} = require('../controllers/newsletterController');

router.use(mockAuth);

// All users — archives (read-only)
router.get('/archives', getArchives);
router.get('/:id', getNewsletterById);
router.get('/:id/items', getNewsletterItems);

// Admin-only
router.post('/', requireRole('Admin'), createNewsletter);
router.get('/', requireRole('Admin'), getMyNewsletters);
router.post('/:id/items', requireRole('Admin'), addItem);
router.delete('/:id/items', requireRole('Admin'), removeItem);
router.post('/:id/generate-pdf', requireRole('Admin'), generatePDF);
// Regenerate PDF for any newsletter status (used when PDF file is missing on disk)
router.post('/:id/regenerate-pdf', requireRole('Admin'), regeneratePDF);
router.patch('/:id/publish', requireRole('Admin'), publishNewsletter);
router.patch('/:id/archive', requireRole('Admin'), archiveNewsletter);

module.exports = router;
