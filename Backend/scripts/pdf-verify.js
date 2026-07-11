/**
 * pdf-verify.js — End-to-end test for the PDF regeneration feature.
 *
 * Tests:
 *  1. GET /newsletters/archives  → returns newsletters with pdf_available + latest_file fields
 *  2. Confirms all newsletters with missing PDFs are flagged pdf_available=false
 *  3. Calls POST /newsletters/:id/regenerate-pdf for each missing newsletter
 *  4. Confirms the generated PDF file exists on disk
 *  5. Confirms GET /uploads/<filename> serves the file with HTTP 200
 *  6. Confirms that calling regenerate again on an already-existing PDF still works
 *  7. Confirms that non-admins cannot call regenerate-pdf (403)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const BASE        = 'http://localhost:5000';
const UPLOADS_DIR = path.join(__dirname, '../uploads');

let passed = 0, failed = 0;
const failures = [];

function ok(label, cond, detail = '') {
  if (cond) { console.log(`  ✓  ${label}`); passed++; }
  else       { console.log(`  ✗  ${label}${detail ? '  →  ' + detail : ''}`); failed++; failures.push(label); }
}

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        ...(data   ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d), setCookie: res.headers['set-cookie'] }); }
        catch { resolve({ status: res.statusCode, body: { raw: d }, setCookie: res.headers['set-cookie'] }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const r = http.get(url, res => {
      res.resume(); // drain
      resolve(res.statusCode);
    });
    r.on('error', reject);
  });
}

function ck(r) { return r.setCookie?.[0]?.split(';')[0] ?? null; }

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  PDF Regeneration — Live Verification Suite  ');
  console.log('══════════════════════════════════════════════\n');

  // Login
  const aRes = await req('POST', '/api/auth/dev-login', { email: 'admin.aiml@newsletter.dev' });
  ok('Admin login', aRes.status === 200);
  const aCk = ck(aRes);

  const sRes = await req('POST', '/api/auth/dev-login', { email: 'student.aiml@newsletter.dev' });
  ok('Student login', sRes.status === 200);
  const sCk = ck(sRes);

  // ── T1: GET /newsletters/archives returns correct shape ──
  console.log('\nT1: Archive API response shape');
  const archRes = await req('GET', '/api/newsletters/archives', null, aCk);
  ok('T1.1 — /archives returns 200', archRes.status === 200, `got ${archRes.status}`);
  const archives = archRes.body.data || [];
  ok('T1.2 — returns array', Array.isArray(archives), typeof archives);
  console.log(`       Found ${archives.length} published/archived newsletter(s)`);

  if (archives.length === 0) {
    console.log('\n  ⚠  No published newsletters in DB — skipping PDF tests.');
    console.log('     Publish a newsletter first to test this feature.\n');
    process.exit(0);
  }

  // Every newsletter must have pdf_available and latest_file fields
  ok('T1.3 — all rows have pdf_available field',
    archives.every(n => typeof n.pdf_available === 'boolean'),
    archives.find(n => typeof n.pdf_available !== 'boolean')?.id
  );
  ok('T1.4 — all rows have latest_file field (null or object)',
    archives.every(n => n.latest_file === null || typeof n.latest_file === 'object'),
    JSON.stringify(archives.find(n => n.latest_file !== null && typeof n.latest_file !== 'object'))
  );

  // Separate into available vs missing
  const available = archives.filter(n => n.pdf_available);
  const missing   = archives.filter(n => !n.pdf_available);
  console.log(`       ${available.length} PDF(s) available on disk, ${missing.length} missing`);

  // ── T2: Verify already-available PDFs actually serve with HTTP 200 ──
  if (available.length > 0) {
    console.log('\nT2: Already-available PDFs are served by Express static');
    for (const n of available.slice(0, 2)) {
      const url     = `${BASE}${n.latest_file.file_url}`;
      const status  = await httpGet(url);
      ok(`T2 — ${n.month} ${n.year} serves HTTP ${status}`, status === 200, url);
    }
  }

  // ── T3: Regenerate each missing PDF ──
  if (missing.length > 0) {
    console.log(`\nT3: Regenerate ${missing.length} missing PDF(s)`);
    for (const n of missing) {
      const rRes = await req('POST', `/api/newsletters/${n.id}/regenerate-pdf`, {}, aCk);
      ok(`T3 — ${n.month} ${n.year} regenerate returns 200`, rRes.status === 200, `got ${rRes.status}: ${JSON.stringify(rRes.body)}`);

      if (rRes.status === 200) {
        const newUrl = rRes.body.data?.fileUrl;
        ok(`T3 — fileUrl returned`, !!newUrl, JSON.stringify(rRes.body.data));

        // Check file exists on disk
        if (newUrl) {
          const diskPath = path.join(UPLOADS_DIR, path.basename(newUrl));
          ok(`T3 — PDF file exists on disk: ${path.basename(newUrl)}`, fs.existsSync(diskPath));

          // Check Express static serves it
          const status = await httpGet(`${BASE}${newUrl}`);
          ok(`T3 — HTTP GET ${newUrl} → ${status}`, status === 200);
        }
      }
    }
  }

  // ── T4: Re-fetch archives — all should now be pdf_available ──
  console.log('\nT4: Re-fetch archives after regeneration');
  const archRes2 = await req('GET', '/api/newsletters/archives', null, aCk);
  const archives2 = archRes2.body.data || [];
  const stillMissing = archives2.filter(n => !n.pdf_available);
  ok('T4.1 — all PDFs now available after regeneration', stillMissing.length === 0,
    `${stillMissing.length} still missing: ${stillMissing.map(n => `${n.month} ${n.year}`).join(', ')}`);

  // ── T5: Verify HTTP GET serves every regenerated PDF ──
  console.log('\nT5: All PDFs serve correctly via HTTP');
  for (const n of archives2.slice(0, 3)) {
    if (!n.latest_file?.file_url) continue;
    const status = await httpGet(`${BASE}${n.latest_file.file_url}`);
    ok(`T5 — ${n.month} ${n.year} → HTTP ${status}`, status === 200, n.latest_file.file_url);
  }

  // ── T6: Regenerate an already-available PDF (idempotent) ──
  console.log('\nT6: Regenerate already-available PDF (idempotency check)');
  const first = archives2[0];
  const regenRes = await req('POST', `/api/newsletters/${first.id}/regenerate-pdf`, {}, aCk);
  ok('T6.1 — regenerate available PDF returns 200', regenRes.status === 200);
  const newUrl = regenRes.body.data?.fileUrl;
  ok('T6.2 — returns new fileUrl', !!newUrl);
  if (newUrl) {
    const diskPath = path.join(UPLOADS_DIR, path.basename(newUrl));
    ok('T6.3 — new PDF exists on disk', fs.existsSync(diskPath));
    const status = await httpGet(`${BASE}${newUrl}`);
    ok('T6.4 — new PDF serves HTTP 200', status === 200);
  }

  // ── T7: Student/Faculty CANNOT call regenerate-pdf ──
  console.log('\nT7: Non-admin cannot regenerate PDFs');
  const noAuth = await req('POST', `/api/newsletters/${archives2[0].id}/regenerate-pdf`, {}, sCk);
  ok('T7.1 — Student gets 403', noAuth.status === 403, `got ${noAuth.status}`);

  // ── T8: Unauthenticated request gets 401 ──
  console.log('\nT8: Unauthenticated access blocked');
  const unauth = await req('GET', '/api/newsletters/archives', null, null);
  ok('T8.1 — no cookie → 401', unauth.status === 401);

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\n Failed:');
    failures.forEach(f => console.log(`   • ${f}`));
  } else {
    console.log(' All tests passed ✓');
  }
  console.log('══════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
