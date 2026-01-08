const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { requireAuth } = require('../middleware/auth');

// GET /api/comments/:recommendationId - Get comments for a recommendation
router.get('/:recommendationId', requireAuth, async (req, res) => {
  try {
    const { recommendationId } = req.params;
    
    const comments = await all(`
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        u.nickname as user_nickname
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.recommendation_id = ?
      ORDER BY c.created_at ASC
    `, [recommendationId]);
    
    res.json(comments);
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/comments/:recommendationId - Add comment to recommendation
router.post('/:recommendationId', requireAuth, async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content required' });
    }
    
    // Check recommendation exists
    const recommendation = await get('SELECT id FROM recommendations WHERE id = ?', [recommendationId]);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    await run(
      'INSERT INTO comments (recommendation_id, user_id, content) VALUES (?, ?, ?)',
      [recommendationId, req.session.userId, content.trim()]
    );
    
    const comment = await get(`
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        u.nickname as user_nickname
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.recommendation_id = ? AND c.user_id = ?
      ORDER BY c.id DESC
      LIMIT 1
    `, [recommendationId, req.session.userId]);
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/comments/:id - Delete a comment (own only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const comment = await get('SELECT * FROM comments WHERE id = ?', [id]);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Only owner or admin can delete
    if (comment.user_id !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await run('DELETE FROM comments WHERE id = ?', [id]);
    
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
