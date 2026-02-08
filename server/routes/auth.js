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

// GET /api/auth/security-questions - List available security questions (public)
router.get('/security-questions', async (req, res) => {
  try {
    const questions = await all('SELECT id, question_text FROM security_questions ORDER BY id');
    res.json(questions);
  } catch (error) {
    console.error('Get security questions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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
    const { inviteCode, username, nickname, password, securityQuestionId, securityAnswer } = req.body;

    if (!inviteCode || !username || !nickname || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (!securityQuestionId || !securityAnswer) {
      return res.status(400).json({ error: 'Security question and answer required' });
    }

    if (securityAnswer.trim().length < 2) {
      return res.status(400).json({ error: 'Security answer must be at least 2 characters' });
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

    // Verify security question exists
    const question = await get('SELECT id FROM security_questions WHERE id = ?', [securityQuestionId]);
    if (!question) {
      return res.status(400).json({ error: 'Invalid security question' });
    }

    // Hash the security answer (case-insensitive, trimmed)
    const normalizedAnswer = securityAnswer.trim().toLowerCase();
    const securityAnswerHash = await bcrypt.hash(normalizedAnswer, 10);

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (username, nickname, password_hash, security_question_id, security_answer_hash) VALUES (?, ?, ?, ?, ?)',
      [username, nickname, passwordHash, securityQuestionId, securityAnswerHash]
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
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await get('SELECT security_question_id FROM users WHERE id = ?', [req.session.userId]);

    res.json({
      id: req.session.userId,
      username: req.session.username,
      nickname: req.session.nickname,
      isAdmin: req.session.isAdmin,
      needsSecurityQuestion: !user.security_question_id
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
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

// GET /api/auth/forgot-password/:username - Get security question for a username
router.get('/forgot-password/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Please enter a valid username' });
    }

    const user = await get(`
      SELECT u.security_question_id, sq.question_text
      FROM users u
      LEFT JOIN security_questions sq ON u.security_question_id = sq.id
      WHERE u.username = ?
    `, [username.trim()]);

    // SECURITY: Don't reveal if username exists
    if (!user || !user.security_question_id) {
      // Return a random question to prevent enumeration
      const randomQuestion = await get('SELECT question_text FROM security_questions ORDER BY RANDOM() LIMIT 1');
      return res.json({
        question: randomQuestion ? randomQuestion.question_text : 'What is your security answer?',
        hasSecurityQuestion: false
      });
    }

    res.json({
      question: user.question_text,
      hasSecurityQuestion: true
    });
  } catch (error) {
    console.error('Forgot password lookup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password - Reset password with security answer
router.post('/forgot-password', async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;

    // Validate inputs
    if (!username || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user
    const user = await get('SELECT * FROM users WHERE username = ?', [username.trim()]);

    // SECURITY: Generic error message to prevent username enumeration
    if (!user || !user.security_answer_hash) {
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return res.status(400).json({ error: 'Unable to reset password. Please contact an administrator.' });
    }

    // Verify security answer (case-insensitive, trimmed)
    const normalizedAnswer = securityAnswer.trim().toLowerCase();
    const validAnswer = await bcrypt.compare(normalizedAnswer, user.security_answer_hash);

    if (!validAnswer) {
      // Log failed attempt (for rate limiting consideration)
      console.log(`[${new Date().toISOString()}] Failed password reset attempt for user: ${username}`);

      // Add delay to slow down brute force
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return res.status(400).json({ error: 'Incorrect security answer' });
    }

    // Reset password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id]);

    // Log successful reset
    console.log(`[${new Date().toISOString()}] Password reset successful for user: ${username} (ID: ${user.id})`);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/security-question - Set or update security question
router.put('/security-question', requireAuth, async (req, res) => {
  try {
    const { securityQuestionId, securityAnswer, currentPassword } = req.body;

    if (!securityQuestionId || !securityAnswer) {
      return res.status(400).json({ error: 'Security question and answer required' });
    }

    if (securityAnswer.trim().length < 2) {
      return res.status(400).json({ error: 'Security answer must be at least 2 characters' });
    }

    // Verify security question exists
    const question = await get('SELECT id FROM security_questions WHERE id = ?', [securityQuestionId]);
    if (!question) {
      return res.status(400).json({ error: 'Invalid security question' });
    }

    // If user already has a security question, require current password to change it
    const user = await get('SELECT security_question_id, password_hash FROM users WHERE id = ?', [req.session.userId]);

    if (user.security_question_id) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to change security question' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash the security answer
    const normalizedAnswer = securityAnswer.trim().toLowerCase();
    const securityAnswerHash = await bcrypt.hash(normalizedAnswer, 10);

    // Update user
    await run(
      'UPDATE users SET security_question_id = ?, security_answer_hash = ? WHERE id = ?',
      [securityQuestionId, securityAnswerHash, req.session.userId]
    );

    res.json({ message: 'Security question updated successfully' });
  } catch (error) {
    console.error('Update security question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
