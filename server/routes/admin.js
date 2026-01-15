const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { run, get, all } = require('../database');
const { requireAdmin } = require('../middleware/auth');

// Generate random invite code
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Helper to check is_admin
function checkIsAdmin(user) {
  if (!user) return false;
  return user.is_admin === true || user.is_admin === 1;
}

// POST /api/admin/invites - Create invite code(s)
router.post('/invites', requireAdmin, async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const numCodes = Math.min(Math.max(1, parseInt(count)), 10); // 1-10 codes at a time
    
    const codes = [];
    for (let i = 0; i < numCodes; i++) {
      let code;
      let attempts = 0;
      
      // Ensure unique code
      do {
        code = generateInviteCode();
        attempts++;
      } while (await get('SELECT id FROM invite_codes WHERE code = ?', [code]) && attempts < 10);
      
      await run(
        'INSERT INTO invite_codes (code, created_by) VALUES (?, ?)',
        [code, req.session.userId]
      );
      
      codes.push(code);
    }
    
    res.json({ codes });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/invites - List all invite codes
router.get('/invites', requireAdmin, async (req, res) => {
  try {
    const invites = await all(`
      SELECT 
        ic.id,
        ic.code,
        ic.created_at,
        ic.used_at,
        creator.nickname as created_by_nickname,
        u.nickname as used_by_nickname
      FROM invite_codes ic
      JOIN users creator ON ic.created_by = creator.id
      LEFT JOIN users u ON ic.used_by = u.id
      ORDER BY ic.created_at DESC
    `);
    
    res.json(invites);
  } catch (error) {
    console.error('List invites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/invites/:code - Delete unused invite code
router.delete('/invites/:code', requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    
    const invite = await get('SELECT * FROM invite_codes WHERE code = ?', [code]);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invite code not found' });
    }
    
    if (invite.used_by) {
      return res.status(400).json({ error: 'Cannot delete used invite code' });
    }
    
    await run('DELETE FROM invite_codes WHERE code = ?', [code]);
    
    res.json({ message: 'Invite code deleted' });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users - List all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await all(`
      SELECT 
        u.id,
        u.username,
        u.nickname,
        u.is_admin,
        u.created_at,
        (SELECT COUNT(*) FROM recommendations WHERE user_id = u.id) as recommendation_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    
    res.json(users.map(u => ({
      ...u,
      isAdmin: checkIsAdmin(u)
    })));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id - Delete a user (cannot delete self or other admins)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (checkIsAdmin(user)) {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }
    
    // Delete user's data (order matters due to foreign key constraints)
    // 1. Delete invite codes where user was the registrant
    await run('DELETE FROM invite_codes WHERE used_by = ?', [userId]);
    // 2. Delete invite codes created by this user
    await run('DELETE FROM invite_codes WHERE created_by = ?', [userId]);
    // 3. Delete recommendation_tags for tags created by this user (before deleting tags)
    await run('DELETE FROM recommendation_tags WHERE tag_id IN (SELECT id FROM tags WHERE created_by = ?)', [userId]);
    // 4. Delete tags created by this user
    await run('DELETE FROM tags WHERE created_by = ?', [userId]);
    // 5. Delete comments by this user
    await run('DELETE FROM comments WHERE user_id = ?', [userId]);
    // 6. Delete upvotes by this user
    await run('DELETE FROM upvotes WHERE user_id = ?', [userId]);
    // 7. Delete recommendation_tags for user's recommendations
    await run('DELETE FROM recommendation_tags WHERE recommendation_id IN (SELECT id FROM recommendations WHERE user_id = ?)', [userId]);
    // 8. Delete recommendations by this user
    await run('DELETE FROM recommendations WHERE user_id = ?', [userId]);
    // 9. Finally, delete the user
    await run('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
