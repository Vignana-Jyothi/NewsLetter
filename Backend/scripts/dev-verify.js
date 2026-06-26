/**
 * dev-verify.js — Quick smoke test for the dev-login bypass.
 * Run with: node scripts/dev-verify.js
 */
const http = require('http');

function post(path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, cookie) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 5000, path, method: 'GET',
      headers: { ...(cookie ? { Cookie: cookie } : {}) },
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const emails = [
    'student.cse@newsletter.dev',
    'faculty.cse@newsletter.dev',
    'admin.cse@newsletter.dev',
    'student.aiml@newsletter.dev',
    'faculty.aiml@newsletter.dev',
    'admin.aiml@newsletter.dev',
  ];

  console.log('\n── Dev Login Verification ──\n');

  for (const email of emails) {
    const r = await post('/api/auth/dev-login', { email });
    if (r.status !== 200) {
      console.log(`FAIL  ${email} — HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      continue;
    }
    const ck = r.headers['set-cookie'][0].split(';')[0];
    const prof = await get('/api/auth/profile', ck);
    const u = prof.body.data;
    const ok = prof.status === 200;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${email.padEnd(35)}  role=${u?.role?.padEnd(8) ?? '?       '}  dept=${u?.department_name ?? '?'}`);
  }

  console.log('\n── Role-Based Access Control ──\n');

  // Student should be blocked from admin routes
  const sR = await post('/api/auth/dev-login', { email: 'student.cse@newsletter.dev' });
  const sCk = sR.headers['set-cookie'][0].split(';')[0];
  const blocked = await get('/api/submissions/admin/pending', sCk);
  console.log(`Student → admin/pending:   ${blocked.status === 403 ? 'BLOCKED (403) ✓' : `ERROR status=${blocked.status}`}`);

  // Admin should have access
  const aR = await post('/api/auth/dev-login', { email: 'admin.cse@newsletter.dev' });
  const aCk = aR.headers['set-cookie'][0].split(';')[0];
  const allowed = await get('/api/submissions/admin/pending', aCk);
  console.log(`Admin  → admin/pending:   ${allowed.status === 200 ? 'ALLOWED (200) ✓' : `ERROR status=${allowed.status}`}`);

  // Unauthenticated request should be 401
  const unauth = await get('/api/auth/profile', null);
  console.log(`No cookie → /auth/profile: ${unauth.status === 401 ? 'REJECTED (401) ✓' : `ERROR status=${unauth.status}`}`);

  console.log('\n── Done ──\n');
}

run().catch(e => console.error('Error:', e.message));
