const pool = require('../config/db');
const NotificationService = require('./NotificationService');

// ─────────────────────────────────────────────
// ApprovalService
// ─────────────────────────────────────────────

const approveSubmission = async (submissionId, adminId, remarks = '') => {
  // Normalize remarks: trim whitespace; treat whitespace-only as empty
  const normalizedRemarks = (remarks || '').trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update submission status
    const result = await client.query(
      `UPDATE Submissions
       SET status = 'Approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'Pending'
       RETURNING *`,
      [submissionId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Submission not found or not in Pending status.');
      err.status = 404;
      throw err;
    }

    const submission = result.rows[0];

    // Write to Approval_History (audit log)
    await client.query(
      `INSERT INTO Approval_History (submission_id, admin_id, action, remarks)
       VALUES ($1, $2, 'Approved', $3)`,
      [submissionId, adminId, normalizedRemarks || null]
    );

    // Notify the submitter
    await NotificationService.createNotification(
      submission.user_id,
      'APPROVAL',
      `Your submission "${submission.title}" has been Approved.`
    );

    await client.query('COMMIT');
    return submission;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const rejectSubmission = async (submissionId, adminId, remarks = '') => {
  // Normalize remarks: trim whitespace; treat whitespace-only as empty
  const normalizedRemarks = (remarks || '').trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Rejected is a TERMINAL STATE — only Pending submissions can be rejected
    const result = await client.query(
      `UPDATE Submissions
       SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'Pending'
       RETURNING *`,
      [submissionId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Submission not found or not in Pending status.');
      err.status = 404;
      throw err;
    }

    const submission = result.rows[0];

    // Write to Approval_History (audit log)
    await client.query(
      `INSERT INTO Approval_History (submission_id, admin_id, action, remarks)
       VALUES ($1, $2, 'Rejected', $3)`,
      [submissionId, adminId, normalizedRemarks || null]
    );

    // Notify the submitter with admin remarks
    const remarkText = normalizedRemarks ? ` Reason: ${normalizedRemarks}` : '';
    await NotificationService.createNotification(
      submission.user_id,
      'REJECTION',
      `Your submission "${submission.title}" has been Rejected.${remarkText}`
    );

    await client.query('COMMIT');
    return submission;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getApprovalHistory = async (submissionId) => {
  const result = await pool.query(
    `SELECT ah.*, u.name AS admin_name
     FROM Approval_History ah
     LEFT JOIN Users u ON u.id = ah.admin_id
     WHERE ah.submission_id = $1
     ORDER BY ah.created_at DESC`,
    [submissionId]
  );
  return result.rows;
};

module.exports = { approveSubmission, rejectSubmission, getApprovalHistory };
