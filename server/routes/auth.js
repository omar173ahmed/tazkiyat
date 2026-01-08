const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { run, get, all, isPostgres } = require('../database');
const { requireAuth } = require('../middleware/auth');

// Helper to check is_admin (different between SQLite and PostgreSQL)
function checkIsAdmin(user) {
  if (!user) return false;
  return user.is_admin === true || user.is_admin === 1;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.nickname = user.nickname;
    req.session.isAdmin = checkIsAdmin(user);
    
    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      isAdmin: checkIsAdmin(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register (with invite code)
router.post('/register', async (req, res) => {
  try {
    const { inviteCode, username, nickname, password } = req.body;
    
    if (!inviteCode || !username || !nickname || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check invite code
    const invite = await get('SELECT * FROM invite_codes WHERE code = ? AND used_by IS NULL', [inviteCode]);
    
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or used invite code' });
    }
    
    // Check if username exists
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)',
      [username, nickname, passwordHash]
    );
    
    // Get the new user
    const newUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    // Mark invite as used
    await run(
      'UPDATE invite_codes SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newUser.id, invite.id]
    );
    
    // Set session
    req.session.userId = newUser.id;
    req.session.username = newUser.username;
    req.session.nickname = newUser.nickname;
    req.session.isAdmin = false;
    
    res.json({
      id: newUser.id,
      username: newUser.username,
      nickname: newUser.nickname,
      isAdmin: false
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    username: req.session.username,
    nickname: req.session.nickname,
    isAdmin: req.session.isAdmin
  });
});

// PUT /api/auth/password (change password)
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const user = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const newHash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.session.userId]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
