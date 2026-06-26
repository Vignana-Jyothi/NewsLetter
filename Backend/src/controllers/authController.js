const pool = require('../config/db');
const AuthService = require('../services/AuthService');

const IS_DEV_MODE = process.env.DEV_MODE === 'true';

// ─────────────────────────────────────────────
// Allowed dev emails → { name, role, department }
// These are inserted into the DB on first use if they don't exist.
// ─────────────────────────────────────────────
const DEV_ACCOUNTS = {
  'student.cse@newsletter.dev':  { name: 'Student CSE',       role: 'Student', department: 'CSE'  },
  'faculty.cse@newsletter.dev':  { name: 'Faculty CSE',       role: 'Faculty', department: 'CSE'  },
  'admin.cse@newsletter.dev':    { name: 'Admin CSE',         role: 'Admin',   department: 'CSE'  },
  'student.aiml@newsletter.dev': { name: 'Student AIML',      role: 'Student', department: 'AIML' },
  'faculty.aiml@newsletter.dev': { name: 'Faculty AIML',      role: 'Faculty', department: 'AIML' },
  'admin.aiml@newsletter.dev':   { name: 'Admin AIML',        role: 'Admin',   department: 'AIML' },
};

// Cookie config for devSession — httpOnly so JS can't tamper with it
const DEV_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  // No 'secure' flag so it works on http://localhost
};

// ─────────────────────────────────────────────
// POST /api/auth/dev-login
// Body: { email }
// Looks up (or creates) the user in the DB, sets devSession cookie.
// Only works when DEV_MODE=true.
// ─────────────────────────────────────────────
const devLogin = async (req, res, next) => {
  if (!IS_DEV_MODE) {
    return res.status(403).json({ error: 'Dev login is disabled in production.' });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const account = DEV_ACCOUNTS[normalizedEmail];

    if (!account) {
      return res.status(400).json({ error: 'Email not in the allowed dev accounts list.' });
    }

    // Ensure the department exists
    const deptResult = await pool.query(
      `SELECT id FROM Departments WHERE name = $1`,
      [account.department]
    );

    if (deptResult.rows.length === 0) {
      return res.status(500).json({ error: `Department "${account.department}" not found in DB. Run initDB first.` });
    }

    const departmentId = deptResult.rows[0].id;

    // Upsert the dev user — insert if not present, skip if already there
    await pool.query(
      `INSERT INTO Users (department_id, name, email, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             role = EXCLUDED.role,
             department_id = EXCLUDED.department_id`,
      [departmentId, account.name, normalizedEmail, account.role]
    );

    // Fetch the full user record (with department name)
    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name AS department_name
       FROM Users u
       LEFT JOIN Departments d ON d.id = u.department_id
       WHERE u.email = $1`,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    // Set the devSession cookie — backend reads this in verifyDevSession()
    const session = JSON.stringify({ userId: user.id, email: user.email });
    res.cookie('devSession', session, DEV_COOKIE_OPTIONS);

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department_name,
        department_id: user.department_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/dev-logout
// Clears the devSession cookie.
// ─────────────────────────────────────────────
const devLogout = (req, res) => {
  res.clearCookie('devSession', { httpOnly: true, sameSite: 'lax' });
  return res.json({ success: true });
};

// ─────────────────────────────────────────────
// Existing controllers (kept as-is)
// ─────────────────────────────────────────────
const getDemoUsers = async (req, res, next) => {
  try {
    const users = await AuthService.getAllDemoUsers();
    const grouped = users.reduce((acc, user) => {
      const dept = user.department || 'Unknown';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(user);
      return acc;
    }, {});
    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
};

const selectUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await AuthService.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { devLogin, devLogout, getDemoUsers, selectUser };
