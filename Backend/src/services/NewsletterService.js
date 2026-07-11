const pool = require('../config/db');
const PDFKit = require('pdfkit');
const fs   = require('fs');
const path = require('path');
const NotificationService = require('./NotificationService');
const EmailService        = require('./EmailService');

// ─────────────────────────────────────────────
// Section mapping
// ─────────────────────────────────────────────
const SECTION_MAP = {
  STUDENT_ACHIEVEMENT: 'Student Achievements',
  CERTIFICATION:       'Certifications',
  SPORTS:              'Sports',
  FACULTY_ACHIEVEMENT: 'Faculty Achievements',
  PLACEMENT:           'Placements',
  RESEARCH:            'Research Publications',
  GUEST_LECTURE:       'Guest Lectures',
  WORKSHOP:            'Workshops & Events',
};

const SECTION_ORDER = [
  'Placements',
  'Student Achievements',
  'Certifications',
  'Sports',
  'Research Publications',
  'Faculty Achievements',
  'Guest Lectures',
  'Workshops & Events',
  'General',
];

const getDiskPathFromFileUrl = (fileUrl) => {
  if (!fileUrl) return null;

  let normalized = String(fileUrl).trim();
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      normalized = normalized.replace(/^https?:\/\/[^/]+/i, '');
    }
  }

  normalized = normalized.replace(/^\/+/, '');
  if (!normalized) return null;

  return path.resolve(__dirname, '../../', normalized);
};

const ensureNewsletterPdfExists = async (newsletterId, latestFile) => {
  if (!newsletterId) return latestFile;

  const diskPath = latestFile?.file_url ? getDiskPathFromFileUrl(latestFile.file_url) : null;
  if (diskPath && fs.existsSync(diskPath)) {
    return latestFile;
  }

  try {
    const generatedUrl = await generatePDF(newsletterId);
    return generatedUrl ? { ...(latestFile || {}), file_url: generatedUrl } : latestFile;
  } catch (err) {
    console.error(`[Archive] Failed to regenerate PDF for newsletter ${newsletterId}:`, err.message);
    return latestFile;
  }
};

// ─────────────────────────────────────────────
// PDF design tokens
// ─────────────────────────────────────────────
const C = {
  brand:   '#5b21b6',
  ink:     '#18181b',
  inkMid:  '#3f3f46',
  inkSoft: '#71717a',
  muted:   '#a1a1aa',
  rule:    '#e4e4e7',
  bg:      '#ffffff',
  pageBg:  '#f9fafb',
  // per-section accent
  accent: {
    'Placements':           '#059669',
    'Student Achievements': '#2563eb',
    'Certifications':       '#7c3aed',
    'Sports':               '#ea580c',
    'Research Publications':'#d97706',
    'Faculty Achievements': '#6d28d9',
    'Guest Lectures':       '#0891b2',
    'Workshops & Events':   '#db2777',
    'General':              '#52525b',
  },
};

const PW   = 595.28;   // A4 width pts
const PH   = 841.89;   // A4 height pts
const ML   = 48;       // left margin
const MR   = 48;       // right margin
const MT   = 44;       // top margin
const MB   = 44;       // bottom margin
const CW   = PW - ML - MR; // content width = 499.28
const FOOTER_H = 32;
const SAFE_BOTTOM = PH - MB - FOOTER_H - 12; // last safe Y before footer

// ─────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────

// Draw the running footer on current page
const drawFooter = (doc, nl, section) => {
  const y = PH - FOOTER_H;
  doc.rect(0, y, PW, FOOTER_H).fill('#18181b');
  doc.fillColor('rgba(255,255,255,0.35)')
     .fontSize(7.5).font('Helvetica')
     .text(
       `${nl.department_name} · ${section}`,
       ML, y + 11, { width: CW / 2, lineBreak: false }
     );
  doc.fillColor('rgba(255,255,255,0.35)')
     .fontSize(7.5).font('Helvetica')
     .text(
       `NewsFlow · VNR VJIET · ${nl.month} ${nl.year}`,
       ML, y + 11,
       { width: CW, align: 'right', lineBreak: false }
     );
};

// Add a new content page, draw footer placeholder, return starting Y
const addContentPage = (doc, nl, section) => {
  doc.addPage();
  doc.rect(0, 0, PW, PH).fill(C.bg);
  // thin top rule in section colour
  doc.rect(0, 0, PW, 3).fill(C.accent[section] || C.brand);
  drawFooter(doc, nl, section);
  return MT;
};

// Draw the cover page — tight, no wasted space
const drawCover = (doc, nl, itemCount) => {
  doc.addPage();

  // Full page background
  doc.rect(0, 0, PW, PH).fill('#18181b');

  // Left accent bar
  doc.rect(0, 0, 5, PH).fill(C.brand);

  // Top metadata
  doc.fillColor('rgba(255,255,255,0.28)')
     .fontSize(8).font('Helvetica')
     .text('VNR VJIET  ·  DEPARTMENT OF AIML  ·  NEWSFLOW', ML + 10, 44, { characterSpacing: 1.5, width: CW });

  // Department + title block — vertically centered
  const blockY = PH * 0.28;

  doc.fillColor(C.brand)
     .fontSize(10).font('Helvetica-Bold')
     .text('AIML DEPARTMENT', ML + 10, blockY, { characterSpacing: 2 });

  doc.fillColor('#ffffff')
     .fontSize(42).font('Helvetica-Bold')
     .text('Academic', ML + 10, blockY + 22, { lineGap: 2 });
  doc.fillColor('#ffffff')
     .fontSize(42).font('Helvetica-Bold')
     .text('Newsletter', ML + 10, doc.y, { lineGap: 2 });

  // Edition line
  doc.fillColor('rgba(255,255,255,0.45)')
     .fontSize(16).font('Helvetica')
     .text(`${nl.month} ${nl.year} Edition`, ML + 10, doc.y + 14);

  // Divider
  doc.rect(ML + 10, doc.y + 18, 60, 2).fill(C.brand);

  // Stats row
  const statsY = doc.y + 30;
  const stats = [
    { label: 'Submissions', val: String(itemCount) },
    { label: 'Department',  val: nl.department_name },
    { label: 'Period',      val: `${nl.month} ${nl.year}` },
  ];
  stats.forEach((s, i) => {
    const x = ML + 10 + i * 160;
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text(s.val, x, statsY, { width: 150, lineBreak: false });
    doc.fillColor('rgba(255,255,255,0.3)').fontSize(8).font('Helvetica')
       .text(s.label.toUpperCase(), x, statsY + 28, { width: 150, lineBreak: false, characterSpacing: 1 });
  });

  // Bottom bar
  doc.rect(0, PH - 50, PW, 50).fill('rgba(0,0,0,0.35)');
  doc.fillColor('rgba(255,255,255,0.25)')
     .fontSize(8).font('Helvetica')
     .text(
       `© ${new Date().getFullYear()} VNR Vignana Jyothi Institute of Engineering & Technology · All rights reserved`,
       ML, PH - 28, { width: CW, align: 'center' }
     );
};

// Draw section heading with accent — returns new Y
const drawSectionHeading = (doc, section, y) => {
  const accent = C.accent[section] || C.brand;
  // Accent rect left bar
  doc.rect(ML, y, 3, 20).fill(accent);
  doc.fillColor(accent)
     .fontSize(9).font('Helvetica-Bold')
     .text(section.toUpperCase(), ML + 10, y + 5, { characterSpacing: 1.5, width: CW - 10 });
  const ruleY = y + 23;
  doc.rect(ML, ruleY, CW, 0.5).fill(C.rule);
  return ruleY + 10;
};

// Embed an image from local uploads path — returns height added, or 0 if skipped
const embedImage = (doc, fileUrl, y, maxW, maxH) => {
  try {
    // fileUrl is like /uploads/uuid.jpg
    const localPath = getDiskPathFromFileUrl(fileUrl);
    if (!localPath || !fs.existsSync(localPath)) return 0;
    const ext = path.extname(localPath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) return 0;

    doc.image(localPath, ML, y, {
      fit:   [maxW, maxH],
      align: 'left',
    });
    // PDFKit doesn't update doc.y after image(), so we compute it
    const imgH = Math.min(maxH, maxW * 0.65); // approximate
    return imgH + 8;
  } catch {
    return 0;
  }
};

// Draw one submission entry — returns final Y
const drawEntry = (doc, item, idx, startY, nl, section) => {
  let y = startY;

  // Guard: if already too close to footer, return sentinel
  if (y > SAFE_BOTTOM - 60) return -1;

  const accent = C.accent[section] || C.brand;

  // ── Item number + title line ──
  // Small index circle
  const circleR = 9;
  doc.circle(ML + circleR, y + circleR, circleR)
     .fillOpacity(0.1).fill(accent).fillOpacity(1);
  doc.fillColor(accent).fontSize(7.5).font('Helvetica-Bold')
     .text(String(idx + 1), ML + circleR - 5, y + circleR - 4, { width: 10, align: 'center', lineBreak: false });

  const titleX = ML + 26;
  doc.fillColor(C.ink).fontSize(11.5).font('Helvetica-Bold')
     .text(item.title, titleX, y, { width: CW - 26, lineBreak: true });
  y = doc.y + 2;

  // ── Byline ──
  doc.fillColor(C.muted).fontSize(8).font('Helvetica-Oblique')
     .text(`— ${item.submitted_by}`, titleX, y, { width: CW - 26, lineBreak: false });
  y = doc.y + 5;

  // ── Description ──
  if (item.description && item.description.trim()) {
    doc.fillColor(C.inkMid).fontSize(9.5).font('Helvetica')
       .text(item.description.trim(), titleX, y, { width: CW - 26, lineGap: 1.5 });
    y = doc.y + 4;
  }

  // ── Metadata ──
  if (item.metadata && Object.keys(item.metadata).length > 0) {
    const pairs = Object.entries(item.metadata)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join('   ·   ');
    if (pairs) {
      doc.fillColor(C.inkSoft).fontSize(8).font('Helvetica')
         .text(pairs, titleX, y, { width: CW - 26, lineBreak: true });
      y = doc.y + 4;
    }
  }

  // ── Proof image (only image files, only if the submission was approved/selected) ──
  const imageFiles = (item.files || []).filter(f => {
    if (!f?.file_url) return false;
    const ext = path.extname(f.file_url).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });

  if (imageFiles.length > 0) {
    const maxImgH = 160;
    const maxImgW = CW - 26;

    // Check if image fits on this page
    if (y + maxImgH > SAFE_BOTTOM) {
      // Will be handled by caller — return current Y, signal overflow
      // For simplicity, skip image if it won't fit
    } else {
      const added = embedImage(doc, imageFiles[0].file_url, y, maxImgW, maxImgH);
      y += added;
    }
  }

  // ── Separator ──
  y += 4;
  doc.rect(titleX, y, CW - 26, 0.4).fillOpacity(0.3).fill(C.rule).fillOpacity(1);
  y += 10;

  return y;
};

// ─────────────────────────────────────────────
// CRUD helpers (unchanged logic, kept compact)
// ─────────────────────────────────────────────

const createNewsletter = async (departmentId, month, year) => {
  const r = await pool.query(
    `INSERT INTO Newsletters (department_id, month, year, status)
     VALUES ($1, $2, $3, 'Draft') RETURNING *`,
    [departmentId, month, year]
  );
  return r.rows[0];
};

const getNewsletterById = async (newsletterId) => {
  const r = await pool.query(
    `SELECT n.*, d.name AS department_name FROM Newsletters n
     JOIN Departments d ON d.id = n.department_id WHERE n.id = $1`,
    [newsletterId]
  );
  return r.rows[0] || null;
};

const getDepartmentNewsletters = async (departmentId) => {
  const r = await pool.query(
    `SELECT n.*, d.name AS department_name,
       (SELECT COUNT(*) FROM Newsletter_Items ni WHERE ni.newsletter_id = n.id) AS item_count
     FROM Newsletters n JOIN Departments d ON d.id = n.department_id
     WHERE n.department_id = $1 ORDER BY n.year DESC, n.month DESC`,
    [departmentId]
  );
  return r.rows;
};

const addItemToNewsletter = async (newsletterId, submissionId, section, position) => {
  const r = await pool.query(
    `INSERT INTO Newsletter_Items (newsletter_id, submission_id, section, position)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *`,
    [newsletterId, submissionId, section, position]
  );
  await pool.query(
    `UPDATE Submissions SET status = 'Selected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [submissionId]
  );
  return r.rows[0];
};

const removeItemFromNewsletter = async (newsletterId, submissionId) => {
  await pool.query(
    `DELETE FROM Newsletter_Items WHERE newsletter_id = $1 AND submission_id = $2`,
    [newsletterId, submissionId]
  );
  await pool.query(
    `UPDATE Submissions SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [submissionId]
  );
};

const getNewsletterItems = async (newsletterId) => {
  const r = await pool.query(
    `SELECT ni.*, s.title, s.description, s.type, s.metadata, s.status AS submission_status,
       u.name AS submitted_by,
       json_agg(sf ORDER BY sf.created_at) FILTER (WHERE sf.id IS NOT NULL) AS files
     FROM Newsletter_Items ni
     JOIN Submissions s ON s.id = ni.submission_id
     JOIN Users u ON u.id = s.user_id
     LEFT JOIN Submission_Files sf ON sf.submission_id = s.id
     WHERE ni.newsletter_id = $1
     GROUP BY ni.id, s.title, s.description, s.type, s.metadata, s.status, u.name
     ORDER BY ni.position`,
    [newsletterId]
  );
  return r.rows;
};

// ─────────────────────────────────────────────
// PDF generation — clean section-wise portrait layout
// ─────────────────────────────────────────────
const generatePDF = async (newsletterId) => {
  const nl = await getNewsletterById(newsletterId);
  if (!nl) throw new Error('Newsletter not found');

  const items = await getNewsletterItems(newsletterId);

  const filename = `newsletter_${nl.department_name}_${nl.month}_${nl.year}_${Date.now()}.pdf`;
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  const fileUrl  = `/uploads/${filename}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({ autoFirstPage: false, size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Cover
    drawCover(doc, nl, items.length);

    // Group items by section
    const grouped = {};
    for (const item of items) {
      const section = item.section || SECTION_MAP[item.type] || 'General';
      item.section = section;
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(item);
    }

    const sections = [...new Set([...SECTION_ORDER, ...Object.keys(grouped)])]
      .filter(s => grouped[s] && grouped[s].length > 0);

    for (const section of sections) {
      let y = addContentPage(doc, nl, section);
      y = drawSectionHeading(doc, section, y);

      const sectionItems = grouped[section];
      let entryIdx = 0;

      for (const item of sectionItems) {
        const newY = drawEntry(doc, item, entryIdx, y, nl, section);

        if (newY === -1) {
          // Item didn't fit — new page for this section
          y = addContentPage(doc, nl, section);
          // Redraw heading continuation
          doc.fillColor(C.muted).fontSize(8).font('Helvetica-Oblique')
             .text(`${section} (continued)`, ML, y, { width: CW });
          y = doc.y + 8;
          const retryY = drawEntry(doc, item, entryIdx, y, nl, section);
          y = retryY === -1 ? y + 80 : retryY; // fallback if still too big
        } else {
          y = newY;
        }
        entryIdx++;
      }
    }

    doc.end();

    stream.on('finish', async () => {
      await pool.query(
        `INSERT INTO Newsletter_Files (newsletter_id, file_url, file_type)
         VALUES ($1, $2, 'PDF')`,
        [newsletterId, fileUrl]
      );
      resolve(fileUrl);
    });
    stream.on('error', reject);
  });
};

// ─────────────────────────────────────────────
// Regenerate PDF — works for any newsletter status (Draft, Published, Archived).
// Used when the PDF file is missing on disk (e.g. after a fresh git clone).
// Generates a new PDF file, inserts a new Newsletter_Files row, and returns
// the new fileUrl.  Old DB rows are NOT deleted (full audit trail).
// ─────────────────────────────────────────────
const regeneratePDF = async (newsletterId) => {
  const nl = await getNewsletterById(newsletterId);
  if (!nl) {
    const err = new Error('Newsletter not found');
    err.status = 404;
    throw err;
  }
  // generatePDF already handles everything — reuse it directly
  return generatePDF(newsletterId);
};

// ─────────────────────────────────────────────
// Publish
// ─────────────────────────────────────────────
const publishNewsletter = async (newsletterId, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE Newsletters SET status = 'Published', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'Draft' RETURNING *`,
      [newsletterId]
    );
    if (result.rows.length === 0) {
      const err = new Error('Newsletter not found or already published.');
      err.status = 404;
      throw err;
    }

    const newsletter = result.rows[0];

    await client.query(
      `UPDATE Submissions s SET status = 'Published', updated_at = CURRENT_TIMESTAMP
       FROM Newsletter_Items ni WHERE ni.newsletter_id = $1 AND ni.submission_id = s.id`,
      [newsletterId]
    );

    const users = await client.query(
      `SELECT u.id, u.name, u.email FROM Users u WHERE u.department_id = $1`,
      [newsletter.department_id]
    );

    for (const user of users.rows) {
      await NotificationService.createNotification(
        user.id, 'PUBLICATION',
        `The ${newsletter.month} ${newsletter.year} Newsletter has been published!`
      );
    }

    const fileResult = await client.query(
      `SELECT file_url FROM Newsletter_Files WHERE newsletter_id = $1 AND file_type = 'PDF'
       ORDER BY created_at DESC LIMIT 1`,
      [newsletterId]
    );

    await client.query('COMMIT');

    const full = await getNewsletterById(newsletterId);

    if (fileResult.rows.length > 0) {
      const pdfPath    = fileResult.rows[0].file_url;
      const backendBase = `http://localhost:${process.env.PORT || 5000}`;
      EmailService.sendNewsletterEmail(users.rows, full, `${backendBase}${pdfPath}`).catch(err => {
        console.error('[Publish] Email error (non-fatal):', err.message);
      });
    }

    return newsletter;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const archiveNewsletter = async (newsletterId) => {
  const result = await pool.query(
    `UPDATE Newsletters SET status = 'Archived', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'Published' RETURNING *`,
    [newsletterId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Newsletter not found or not in Published status.');
    err.status = 404;
    throw err;
  }
  await pool.query(
    `UPDATE Submissions s SET status = 'Archived', updated_at = CURRENT_TIMESTAMP
     FROM Newsletter_Items ni WHERE ni.newsletter_id = $1 AND ni.submission_id = s.id`,
    [newsletterId]
  );
  return result.rows[0];
};

const getArchivedNewsletters = async (departmentId) => {
  const r = await pool.query(
    `SELECT n.*, d.name AS department_name,
       -- Return the single most-recent PDF file for each newsletter
       (SELECT row_to_json(nf)
        FROM Newsletter_Files nf
        WHERE nf.newsletter_id = n.id AND nf.file_type = 'PDF'
        ORDER BY nf.created_at DESC
        LIMIT 1
       ) AS latest_file,
       (SELECT COUNT(*)
        FROM Newsletter_Items ni
        WHERE ni.newsletter_id = n.id
       ) AS item_count
     FROM Newsletters n
     JOIN Departments d ON d.id = n.department_id
     WHERE n.department_id = $1 AND n.status IN ('Published', 'Archived')
     ORDER BY n.year DESC, n.month DESC`,
    [departmentId]
  );

  // Annotate each row with whether the PDF file actually exists on disk right now
  const results = [];
  for (const nl of r.rows) {
    const latestFile = nl.latest_file ?? null;
    let pdf_available = false;
    let resolvedFile = latestFile;

    if (latestFile?.file_url) {
      const diskPath = getDiskPathFromFileUrl(latestFile.file_url);
      pdf_available = Boolean(diskPath && fs.existsSync(diskPath));

      if (!pdf_available) {
        resolvedFile = await ensureNewsletterPdfExists(nl.id, latestFile);
        const regeneratedPath = resolvedFile?.file_url ? getDiskPathFromFileUrl(resolvedFile.file_url) : null;
        pdf_available = Boolean(regeneratedPath && fs.existsSync(regeneratedPath));
      }
    }

    results.push({
      ...nl,
      latest_file: resolvedFile,  // single object or null
      pdf_available,              // boolean — false means regeneration still failed
    });
  }

  return results;
};

module.exports = {
  createNewsletter,
  getNewsletterById,
  getDepartmentNewsletters,
  addItemToNewsletter,
  removeItemFromNewsletter,
  getNewsletterItems,
  generatePDF,
  regeneratePDF,
  publishNewsletter,
  archiveNewsletter,
  getArchivedNewsletters,
  SECTION_MAP,
};
