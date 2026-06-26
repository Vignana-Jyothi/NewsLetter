/**
 * remarks-verify.js — End-to-end test for admin remarks feature.
 * Run: node scripts/remarks-verify.js
 *
 * Flow:
 *  1. Dev-login as student.cse
 *  2. Create a submission (Draft)
 *  3. Submit it for approval (Pending)
 *  4. Dev-login as admin.cse
 *  5. Reject it with remarks
 *  6. Dev-login as student.cse again
 *  7. GET /submissions/mine  → verify admin_remarks is present
 *  8. GET /submissions/:id   → verify admin_remarks on single fetch
 *  9. PATCH /submissions/:id/reopen → verify goes back to Draft
 * 10. Create a second submission, approve it with remarks, verify remarks come back
 */
const http = require('http');

const BASE = 'http://localhost:5000';

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d), cookie: res.headers['set-cookie'] }); }
        catch { resolve({ status: res.statusCode, body: d, cookie: res.headers['set-cookie'] }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function ck(r) { return r.cookie ? r.cookie[0].split(';')[0] : null; }
function pass(msg) { console.log(`  ✓  ${msg}`); }
function fail(msg) { console.log(`  ✗  ${msg}`); process.exitCode = 1; }
function check(cond, msg) { cond ? pass(msg) : fail(msg); }

async function run() {
  console.log('\n═══ Admin Remarks End-to-End Verification ═══\n');

  // ── 1. Login as student ──
  console.log('1. Login as student.cse@newsletter.dev');
  const sLogin = await req('POST', '/api/auth/dev-login', { email: 'student.cse@newsletter.dev' });
  check(sLogin.status === 200, `Dev login student — HTTP ${sLogin.status}`);
  const sCk = ck(sLogin);

  // ── 2. Create submission ──
  console.log('\n2. Create a Draft submission');
  const createRes = await req('POST', '/api/submissions',
    { type: 'PLACEMENT', title: 'Test Placement', description: 'Test desc', metadata: JSON.stringify({ company: 'ACME', role: 'Engineer' }) },
    sCk
  );
  // Note: backend expects multipart for file uploads, but plain JSON works for no-file submissions? 
  // Actually the route uses upload.array — let's check. It uses multer so non-multipart still goes through,
  // multer just won't find files. But metadata must be a string in the body.
  check(createRes.status === 201, `Create submission — HTTP ${createRes.status}`);
  const subId = createRes.body?.data?.id;
  check(!!subId, `Got submission id: ${subId}`);

  // ── 3. Submit for approval ──
  console.log('\n3. Submit for approval');
  const submitRes = await req('PATCH', `/api/submissions/${subId}/submit`, {}, sCk);
  check(submitRes.status === 200, `Submit for approval — HTTP ${submitRes.status}`);
  check(submitRes.body?.data?.status === 'Pending', `Status is Pending`);

  // ── 4. Login as admin ──
  console.log('\n4. Login as admin.cse@newsletter.dev');
  const aLogin = await req('POST', '/api/auth/dev-login', { email: 'admin.cse@newsletter.dev' });
  check(aLogin.status === 200, `Dev login admin — HTTP ${aLogin.status}`);
  const aCk = ck(aLogin);

  // ── 5. Reject with remarks ──
  const REMARKS = 'Please correct the formatting and upload a higher-quality image.';
  console.log('\n5. Reject submission with remarks');
  const rejectRes = await req('PATCH', `/api/approvals/${subId}/reject`, { remarks: REMARKS }, aCk);
  check(rejectRes.status === 200, `Reject — HTTP ${rejectRes.status}`);
  check(rejectRes.body?.data?.status === 'Rejected', `Status is Rejected`);

  // ── 6. Back to student, check /mine ──
  console.log('\n6. Student fetches /submissions/mine');
  const mineRes = await req('GET', '/api/submissions/mine', null, sCk);
  check(mineRes.status === 200, `GET /mine — HTTP ${mineRes.status}`);
  const found = mineRes.body?.data?.find(s => s.id === subId);
  check(!!found, `Submission found in list`);
  check(found?.status === 'Rejected', `Status is Rejected in list`);
  check(found?.admin_remarks === REMARKS, `admin_remarks correct in list: "${found?.admin_remarks}"`);

  // ── 7. Single submission fetch ──
  console.log('\n7. Student fetches single submission by ID');
  const byIdRes = await req('GET', `/api/submissions/${subId}`, null, sCk);
  check(byIdRes.status === 200, `GET /:id — HTTP ${byIdRes.status}`);
  check(byIdRes.body?.data?.admin_remarks === REMARKS, `admin_remarks correct on single fetch`);

  // ── 8. Reopen rejected submission ──
  console.log('\n8. Student reopens rejected submission');
  const reopenRes = await req('PATCH', `/api/submissions/${subId}/reopen`, {}, sCk);
  check(reopenRes.status === 200, `Reopen — HTTP ${reopenRes.status}`);
  check(reopenRes.body?.data?.status === 'Draft', `Status back to Draft`);

  // ── 9. Verify remarks still appear after reopen (via GET) ──
  console.log('\n9. Verify remarks persist after reopen');
  const afterReopen = await req('GET', `/api/submissions/${subId}`, null, sCk);
  check(afterReopen.body?.data?.admin_remarks === REMARKS, `admin_remarks persist after reopen`);
  check(afterReopen.body?.data?.status === 'Draft', `Status is Draft after reopen`);

  // ── 10. Test approval with remarks ──
  console.log('\n10. Test approve path with remarks');

  // Create + submit a second submission
  const c2 = await req('POST', '/api/submissions',
    { type: 'RESEARCH', title: 'Research Paper', description: 'AI paper', metadata: JSON.stringify({ journal: 'IEEE', paper_title: 'Deep Learning Advances' }) },
    sCk
  );
  const sub2Id = c2.body?.data?.id;
  await req('PATCH', `/api/submissions/${sub2Id}/submit`, {}, sCk);

  const APPROVAL_REMARKS = 'Great work! Minor typo in abstract — fix before final newsletter.';
  const approveRes = await req('PATCH', `/api/approvals/${sub2Id}/approve`, { remarks: APPROVAL_REMARKS }, aCk);
  check(approveRes.status === 200, `Approve — HTTP ${approveRes.status}`);

  const approvedFetch = await req('GET', `/api/submissions/${sub2Id}`, null, sCk);
  check(approvedFetch.body?.data?.status === 'Approved', `Status is Approved`);
  check(approvedFetch.body?.data?.admin_remarks === APPROVAL_REMARKS, `Approval remarks present: "${approvedFetch.body?.data?.admin_remarks}"`);

  // ── 11. Verify no remarks when admin didn't add any ──
  console.log('\n11. Verify no remarks field when admin left remarks empty');
  const c3 = await req('POST', '/api/submissions',
    { type: 'SPORTS', title: 'No Remarks Submission', description: 'desc', metadata: JSON.stringify({ sport: 'Cricket', event: 'Inter-college' }) },
    sCk
  );
  const sub3Id = c3.body?.data?.id;
  await req('PATCH', `/api/submissions/${sub3Id}/submit`, {}, sCk);
  await req('PATCH', `/api/approvals/${sub3Id}/approve`, { remarks: '' }, aCk); // empty remarks
  const noRemarksRes = await req('GET', `/api/submissions/${sub3Id}`, null, sCk);
  check(
    noRemarksRes.body?.data?.admin_remarks === null || noRemarksRes.body?.data?.admin_remarks === undefined,
    `admin_remarks is null/undefined when empty: ${JSON.stringify(noRemarksRes.body?.data?.admin_remarks)}`
  );

  // ── 12. RBAC: student cannot access another student's /reopen ──
  console.log('\n12. RBAC — student cannot reopen another user\'s submission');
  const sLogin2 = await req('POST', '/api/auth/dev-login', { email: 'student.aiml@newsletter.dev' });
  const s2Ck = ck(sLogin2);
  const unauthorizedReopen = await req('PATCH', `/api/submissions/${subId}/reopen`, {}, s2Ck);
  check(
    unauthorizedReopen.status === 404 || unauthorizedReopen.status === 403,
    `Cross-user reopen correctly blocked (HTTP ${unauthorizedReopen.status})`
  );

  console.log('\n═══ Done ═══\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
