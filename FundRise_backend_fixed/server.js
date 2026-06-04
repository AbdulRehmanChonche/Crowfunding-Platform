// server.js – FundRise Express + MySQL Backend
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const db       = require('./db');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ success: false, message: 'All fields are required.' });

  db.query('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?',
    [username, password, role], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error.', error: err.message });
      if (!results.length)
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      const user = results[0];
      res.json({ success: true, message: 'Login successful!',
        user: { id: user.id, username: user.username, fname: user.fname, lname: user.lname,
                email: user.email, role: user.role, org: user.org } });
    });
});

app.post('/api/register', (req, res) => {
  const { fname, lname, email, username, password, role, org, bio } = req.body;
  if (!fname || !lname || !email || !username || !password || !role)
    return res.status(400).json({ success: false, message: 'Required fields are missing.' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

  db.query('INSERT INTO users (fname, lname, email, username, password, role, org, bio) VALUES (?,?,?,?,?,?,?,?)',
    [fname, lname, email, username, password, role, org || null, bio || null], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ success: false, message: 'Username or email already exists.' });
        return res.status(500).json({ success: false, message: 'Database error.', error: err.message });
      }
      res.status(201).json({ success: true, message: 'Account created!', userId: result.insertId });
    });
});

// ─────────────────────────────────────────────
// CAMPAIGN ROUTES
// ─────────────────────────────────────────────

// GET /api/campaigns — list active campaigns (optional ?category= & ?search=)
app.get('/api/campaigns', (req, res) => {
  const { category, search, status } = req.query;
  let sql = 'SELECT * FROM campaigns WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  else         { sql += " AND status = 'active'"; }

  if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND (title LIKE ? OR short_desc LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, campaigns: results });
  });
});

// GET /api/campaigns/all — admin: ALL campaigns regardless of status
app.get('/api/campaigns/all', (req, res) => {
  db.query('SELECT * FROM campaigns ORDER BY submitted_at DESC, id DESC', (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, campaigns: results });
  });
});

// GET /api/campaigns/creator/:creatorId — campaigns by creator (FIX #4)
app.get('/api/campaigns/creator/:creatorId', (req, res) => {
  db.query('SELECT * FROM campaigns WHERE creator_id = ? ORDER BY id DESC',
    [req.params.creatorId], (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, campaigns: results });
    });
});

// GET /api/campaigns/:id — single campaign
app.get('/api/campaigns/:id', (req, res) => {
  db.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!results.length) return res.status(404).json({ success: false, message: 'Campaign not found.' });
    res.json({ success: true, campaign: results[0] });
  });
});

// POST /api/campaigns — create (Campaign role only, enforced client-side)
app.post('/api/campaigns', (req, res) => {
  const { title, category, goal, duration, creator, creator_id, short_desc, full_desc, email, website, emoji, color, upi_id } = req.body;
  if (!title || !category || !goal || !duration || !creator || !short_desc || !upi_id)
    return res.status(400).json({ success: false, message: 'Required campaign fields are missing (including UPI ID).' });

  db.query(`INSERT INTO campaigns
    (title, category, goal, duration, days_left, creator, creator_id, short_desc, full_desc, email, website, emoji, color, upi_id, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`,
    [title, category, goal, duration, duration, creator, creator_id || null,
     short_desc, full_desc || null, email || null, website || null, emoji || '🌱', color || '#D4EDDA', upi_id],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.status(201).json({ success: true, message: 'Campaign submitted for review!', campaignId: result.insertId });
    });
});

// PATCH /api/campaigns/:id/status — admin approve/reject/complete (FIX #2)
app.patch('/api/campaigns/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'rejected', 'completed', 'pending'];
  if (!allowed.includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status value.' });

  db.query('UPDATE campaigns SET status = ? WHERE id = ?', [status, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Campaign not found.' });
    res.json({ success: true, message: `Campaign marked as ${status}.` });
  });
});

// DELETE /api/campaigns/:id
app.delete('/api/campaigns/:id', (req, res) => {
  db.query('DELETE FROM campaigns WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Campaign not found.' });
    res.json({ success: true, message: 'Campaign deleted.' });
  });
});

// ─────────────────────────────────────────────
// DONATION ROUTES
// ─────────────────────────────────────────────

app.post('/api/donate', (req, res) => {
  const { campaign_id, donor_id, donor_name, amount, utr_id } = req.body;
  if (!campaign_id || !amount || amount <= 0)
    return res.status(400).json({ success: false, message: 'campaign_id and a positive amount are required.' });
  if (!utr_id || !utr_id.trim())
    return res.status(400).json({ success: false, message: 'UTR ID is required to record donation.' });

  db.query('INSERT INTO donations (campaign_id, donor_id, donor_name, amount, utr_id) VALUES (?,?,?,?,?)',
    [campaign_id, donor_id || null, donor_name || 'Anonymous', amount, utr_id], (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      db.query('UPDATE campaigns SET raised = raised + ? WHERE id = ?', [amount, campaign_id], (err2) => {
        if (err2) return res.status(500).json({ success: false, error: err2.message });
        res.json({ success: true, message: 'Donation recorded. Thank you! 💚' });
      });
    });
});

app.get('/api/campaigns/:id/donations', (req, res) => {
  db.query('SELECT donor_name, amount, donated_at, utr_id FROM donations WHERE campaign_id = ? ORDER BY donated_at DESC',
    [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, donations: results });
    });
});

// ─────────────────────────────────────────────
// USERS ROUTE — admin: real donor data (FIX #1)
// ─────────────────────────────────────────────

app.get('/api/users', (req, res) => {
  const sql = `
    SELECT u.id, u.fname, u.lname, u.email, u.username, u.role, u.org, u.created_at,
      COALESCE(SUM(d.amount), 0) AS total_donated,
      COUNT(d.id)               AS donation_count,
      MAX(d.donated_at)         AS last_donated
    FROM users u
    LEFT JOIN donations d ON u.id = d.donor_id
    WHERE u.role = 'Donor'
    GROUP BY u.id
    ORDER BY total_donated DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, users: results });
  });
});

// ─────────────────────────────────────────────
// STATS ROUTE
// ─────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const queries = {
    totalRaised:    'SELECT COALESCE(SUM(amount), 0) AS val FROM donations',
    totalCampaigns: "SELECT COUNT(*) AS val FROM campaigns WHERE status = 'active'",
    pendingCount:   "SELECT COUNT(*) AS val FROM campaigns WHERE status = 'pending'",
    totalDonors:    'SELECT COUNT(DISTINCT donor_id) AS val FROM donations WHERE donor_id IS NOT NULL',
    totalUsers:     'SELECT COUNT(*) AS val FROM users',
  };
  const stats = {};
  const keys  = Object.keys(queries);
  let done    = 0;
  keys.forEach((key) => {
    db.query(queries[key], (err, rows) => {
      stats[key] = err ? 0 : rows[0].val;
      if (++done === keys.length) res.json({ success: true, stats });
    });
  });
});

app.listen(PORT, () => console.log(`🚀 FundRise server running at http://localhost:${PORT}`));
