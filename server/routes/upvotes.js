const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { requireAuth } = require('../middleware/auth');

// POST /api/upvotes/:recommendationId/toggle - Toggle upvote
router.post('/:recommendationId/toggle', requireAuth, async (req, res) => {
  try {
    const { recommendationId } = req.params;
    const userId = req.session.userId;
    
    // Check recommendation exists
    const recommendation = await get('SELECT * FROM recommendations WHERE id = ?', [recommendationId]);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    // Check if already upvoted
    const existingUpvote = await get(
      'SELECT * FROM upvotes WHERE user_id = ? AND recommendation_id = ?',
      [userId, recommendationId]
    );
    
    let upvoted;
    
    if (existingUpvote) {
      // Remove upvote
      await run('DELETE FROM upvotes WHERE user_id = ? AND recommendation_id = ?', [userId, recommendationId]);
      await run('UPDATE recommendations SET upvote_count = upvote_count - 1 WHERE id = ?', [recommendationId]);
      upvoted = false;
    } else {
      // Add upvote
      await run('INSERT INTO upvotes (user_id, recommendation_id) VALUES (?, ?)', [userId, recommendationId]);
      await run('UPDATE recommendations SET upvote_count = upvote_count + 1 WHERE id = ?', [recommendationId]);
      upvoted = true;
    }
    
    // Get updated count
    const updated = await get('SELECT upvote_count FROM recommendations WHERE id = ?', [recommendationId]);
    
    res.json({
      upvoted,
      upvote_count: updated.upvote_count
    });
  } catch (error) {
    console.error('Toggle upvote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
