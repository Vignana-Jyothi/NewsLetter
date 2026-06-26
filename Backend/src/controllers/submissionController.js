const SubmissionService = require('../services/SubmissionService');

const createSubmission = async (req, res, next) => {
  try {
    const { type, title, description, metadata } = req.body;
    const files = req.files || [];
    const parsedMeta = metadata ? JSON.parse(metadata) : {};

    const submission = await SubmissionService.createSubmission(
      req.user.id,
      { type, title, description, metadata: parsedMeta },
      files
    );
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

const updateSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, metadata } = req.body;
    const parsedMeta = metadata ? JSON.parse(metadata) : {};

    const submission = await SubmissionService.updateSubmission(
      id,
      req.user.id,
      { title, description, metadata: parsedMeta }
    );
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

const submitForApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await SubmissionService.submitForApproval(id, req.user.id);
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

// PATCH /submissions/:id/reopen
// Resets a Rejected submission back to Draft so the user can edit and resubmit.
const reopenSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await SubmissionService.reopenRejectedSubmission(id, req.user.id);
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await SubmissionService.getUserSubmissions(req.user.id);
    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};

const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await SubmissionService.getSubmissionById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

const getPendingSubmissions = async (req, res, next) => {
  try {
    const submissions = await SubmissionService.getPendingSubmissions(req.user.department_id);
    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};

const getApprovedSubmissions = async (req, res, next) => {
  try {
    const submissions = await SubmissionService.getApprovedSubmissions(req.user.department_id);
    res.json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSubmission,
  updateSubmission,
  submitForApproval,
  reopenSubmission,
  getMySubmissions,
  getSubmissionById,
  getPendingSubmissions,
  getApprovedSubmissions,
};
