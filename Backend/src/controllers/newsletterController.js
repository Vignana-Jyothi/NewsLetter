const NewsletterService = require('../services/NewsletterService');

const createNewsletter = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const newsletter = await NewsletterService.createNewsletter(
      req.user.department_id,
      month,
      parseInt(year)
    );
    res.status(201).json({ success: true, data: newsletter });
  } catch (err) {
    // Handle unique constraint violation (duplicate newsletter)
    if (err.code === '23505') {
      return res.status(409).json({
        error: `A newsletter for ${req.body.month} ${req.body.year} already exists for your department.`,
      });
    }
    next(err);
  }
};

const getMyNewsletters = async (req, res, next) => {
  try {
    const newsletters = await NewsletterService.getDepartmentNewsletters(req.user.department_id);
    res.json({ success: true, data: newsletters });
  } catch (err) {
    next(err);
  }
};

const getNewsletterById = async (req, res, next) => {
  try {
    const newsletter = await NewsletterService.getNewsletterById(req.params.id);
    if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
    res.json({ success: true, data: newsletter });
  } catch (err) {
    next(err);
  }
};

const getNewsletterItems = async (req, res, next) => {
  try {
    const items = await NewsletterService.getNewsletterItems(req.params.id);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { submissionId, section, position } = req.body;
    const item = await NewsletterService.addItemToNewsletter(
      req.params.id,
      submissionId,
      section,
      position
    );
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const { submissionId } = req.body;
    await NewsletterService.removeItemFromNewsletter(req.params.id, submissionId);
    res.json({ success: true, message: 'Item removed from newsletter' });
  } catch (err) {
    next(err);
  }
};

const generatePDF = async (req, res, next) => {
  try {
    const fileUrl = await NewsletterService.generatePDF(req.params.id);
    res.json({ success: true, data: { fileUrl } });
  } catch (err) {
    next(err);
  }
};

// Regenerate PDF for any status — used when local file is missing after git clone
const regeneratePDF = async (req, res, next) => {
  try {
    const fileUrl = await NewsletterService.regeneratePDF(req.params.id);
    res.json({ success: true, data: { fileUrl } });
  } catch (err) {
    next(err);
  }
};

const publishNewsletter = async (req, res, next) => {
  try {
    const newsletter = await NewsletterService.publishNewsletter(req.params.id, req.user.id);
    res.json({ success: true, data: newsletter });
  } catch (err) {
    next(err);
  }
};

const archiveNewsletter = async (req, res, next) => {
  try {
    const newsletter = await NewsletterService.archiveNewsletter(req.params.id);
    res.json({ success: true, data: newsletter });
  } catch (err) {
    next(err);
  }
};

const getArchives = async (req, res, next) => {
  try {
    const newsletters = await NewsletterService.getArchivedNewsletters(req.user.department_id);
    res.json({ success: true, data: newsletters });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
