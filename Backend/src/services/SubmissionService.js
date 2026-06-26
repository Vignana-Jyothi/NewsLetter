const pool = require('../config/db');
const StorageService = require('./StorageService');
const NotificationService = require('./NotificationService');

// ─────────────────────────────────────────────
// SubmissionService
// ─────────────────────────────────────────────

const createSubmission = async (userId, { type, title, description, metadata }, files) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO Submissions (user_id, type, title, description, metadata, status)
       VALUES ($1, $2, $3, $4, $5, 'Draft')
       RETURNING *`,
      [userId, type, title, description, JSON.stringify(metadata || {})]
    );
    const submission = result.rows[0];

    if (files && files.length > 0) {
      for (const file of files) {
        const fileUrl = StorageService.uploadFile(file);
        await client.query(
          `INSERT INTO Submission_Files (submission_id, file_url, file_type)
           VALUES ($1, $2, $3)`,
          [submission.id, fileUrl, file.mimetype]
        );
      }
    }

    await client.query('COMMIT');
    return submission;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const submitForApproval = async (submissionId, userId) => {
  const result = await pool.query(
    `UPDATE Submissions
     SET status = 'Pending', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 AND status = 'Draft'
     RETURNING *`,
    [submissionId, userId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Submission not found or cannot be submitted.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

const getUserSubmissions = async (userId) => {
  const result = await pool.query(
    // Pull the most-recent remark from Approval_History for each submission
    // so students/faculty can see admin feedback directly on the list.
    `SELECT s.*,
       json_agg(sf ORDER BY sf.created_at) FILTER (WHERE sf.id IS NOT NULL) AS files,
       (
         SELECT ah.remarks
         FROM Approval_History ah
         WHERE ah.submission_id = s.id
           AND ah.remarks IS NOT NULL
           AND ah.remarks <> ''
         ORDER BY ah.created_at DESC
         LIMIT 1
       ) AS admin_remarks
     FROM Submissions s
     LEFT JOIN Submission_Files sf ON sf.submission_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return result.rows;
};

const getSubmissionById = async (submissionId) => {
  const result = await pool.query(
    `SELECT s.*, u.name AS submitted_by, u.role AS submitter_role,
       d.name AS department,
       json_agg(sf ORDER BY sf.created_at) FILTER (WHERE sf.id IS NOT NULL) AS files,
       (
         SELECT ah.remarks
         FROM Approval_History ah
         WHERE ah.submission_id = s.id
           AND ah.remarks IS NOT NULL
           AND ah.remarks <> ''
         ORDER BY ah.created_at DESC
         LIMIT 1
       ) AS admin_remarks
     FROM Submissions s
     LEFT JOIN Users u ON u.id = s.user_id
     LEFT JOIN Departments d ON d.id = u.department_id
     LEFT JOIN Submission_Files sf ON sf.submission_id = s.id
     WHERE s.id = $1
     GROUP BY s.id, u.name, u.role, d.name`,
    [submissionId]
  );
  return result.rows[0] || null;
};

const getPendingSubmissions = async (departmentId) => {
  const result = await pool.query(
    `SELECT s.*, u.name AS submitted_by, u.role AS submitter_role,
       json_agg(sf) FILTER (WHERE sf.id IS NOT NULL) AS files
     FROM Submissions s
     JOIN Users u ON u.id = s.user_id
     LEFT JOIN Submission_Files sf ON sf.submission_id = s.id
     WHERE s.status = 'Pending' AND u.department_id = $1
     GROUP BY s.id, u.name, u.role
     ORDER BY s.created_at ASC`,
    [departmentId]
  );
  return result.rows;
};

const getApprovedSubmissions = async (departmentId) => {
  const result = await pool.query(
    `SELECT s.*, u.name AS submitted_by,
       json_agg(sf) FILTER (WHERE sf.id IS NOT NULL) AS files
     FROM Submissions s
     JOIN Users u ON u.id = s.user_id
     LEFT JOIN Submission_Files sf ON sf.submission_id = s.id
     WHERE s.status = 'Approved' AND u.department_id = $1
     GROUP BY s.id, u.name
     ORDER BY s.type, s.created_at ASC`,
    [departmentId]
  );
  return result.rows;
};

const updateSubmission = async (submissionId, userId, updates) => {
  const result = await pool.query(
    `UPDATE Submissions
     SET title = $1, description = $2, metadata = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND user_id = $5 AND status = 'Draft'
     RETURNING *`,
    [updates.title, updates.description, JSON.stringify(updates.metadata || {}), submissionId, userId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Submission not found or not in Draft status.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

// Reopen a Rejected submission so the user can correct and resubmit.
// Resets status back to Draft and clears any Selected/Published lock.
const reopenRejectedSubmission = async (submissionId, userId) => {
  const result = await pool.query(
    `UPDATE Submissions
     SET status = 'Draft', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 AND status = 'Rejected'
     RETURNING *`,
    [submissionId, userId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Submission not found or not in Rejected status.');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
};

module.exports = {
  createSubmission,
  submitForApproval,
  getUserSubmissions,
  getSubmissionById,
  getPendingSubmissions,
  getApprovedSubmissions,
  updateSubmission,
  reopenRejectedSubmission,
};
