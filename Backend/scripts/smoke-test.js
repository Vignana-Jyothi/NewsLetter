/**
 * smoke-test.js — NEWSFLOW Backend Smoke Test
 *
 * Referenced in Moredetails.md: "node scripts/smoke-test.js" or "npm run test:smoke"
 *
 * Checks:
 *   1. Backend health endpoint is reachable
 *   2. PostgreSQL DB connection is alive
 *   3. Central auth server (auth.vjstartup.com / localhost:3115) is reachable
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const http = require('http');
const https = require('https');
const { Pool } = require('pg');

const BACKEND_PORT = process.env.PORT || 5000;
const AUTH_URL     = process.env.AUTH_URL || 'http://localhost:3115';

let passed = 0;
let failed = 0;

const ok  = (msg) => { console.log(`  ✅ ${msg}`); passed++; };
const err = (msg) => { console.log(`  ❌ ${msg}`); failed++; };

// ── Helper: HTTP/HTTPS GET ──────────────────────────────────────────────────
function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── Check 1: Backend health ─────────────────────────────────────────────────
async function checkBackendHealth() {
  console.log('\n1️⃣  Backend Health Check');
  try {
    const { status, body } = await httpGet(`http://localhost:${BACKEND_PORT}/api/health`);
    if (status === 200) {
      ok(`Backend is up — ${body.trim()}`);
    } else {
      err(`Backend health check returned HTTP ${status}`);
    }
  } catch (e) {
    err(`Backend unreachable on port ${BACKEND_PORT} — is it running? (${e.message})`);
  }
}

// ── Check 2: PostgreSQL connection ──────────────────────────────────────────
async function checkDatabase() {
  console.log('\n2️⃣  PostgreSQL Connection');
  const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    const res = await pool.query('SELECT NOW()');
    ok(`PostgreSQL connected — server time: ${res.rows[0].now}`);
  } catch (e) {
    err(`PostgreSQL connection failed — ${e.message}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

// ── Check 3: Auth server reachable ──────────────────────────────────────────
async function checkAuthServer() {
  console.log('\n3️⃣  Auth Server Reachability');

  // Try a simple GET to /check-auth — it will return 401 if no cookie, but
  // that still means the server is up and responding.
  const pingUrl = `${AUTH_URL}/check-auth`;
  try {
    const { status } = await httpGet(pingUrl);
    if (status === 200 || status === 401 || status === 403) {
      ok(`Auth server is up at ${AUTH_URL} (HTTP ${status})`);
    } else {
      err(`Auth server returned unexpected HTTP ${status}`);
    }
  } catch (e) {
    err(`Auth server unreachable at ${AUTH_URL} — ${e.message}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🧪  NEWSFLOW Smoke Test');
  console.log('══════════════════════════════════════');

  await checkBackendHealth();
  await checkDatabase();
  await checkAuthServer();

  console.log('\n══════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\n⚠️  Some checks failed. Fix the issues above before running the app.');
    process.exit(1);
  } else {
    console.log('\n🚀  All checks passed! The system is ready.');
    process.exit(0);
  }
})();
