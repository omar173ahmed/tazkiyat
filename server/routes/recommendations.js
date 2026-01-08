const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { fetchTitle } = require('../utils/fetchTitle');

// GET /api/recommendations - List recommendations with search/filter/sort
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, tag, sort = 'newest', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.session.userId;
    
    let whereClause = '1=1';
    let params = [];
    
    // Search in title and tags
    if (search) {
      whereClause += ` AND (r.title LIKE ? OR r.url LIKE ? OR EXISTS (
        SELECT 1 FROM recommendation_tags rt2 
        JOIN tags t2 ON rt2.tag_id = t2.id 
        WHERE rt2.recommendation_id = r.id AND t2.name LIKE ?
      ))`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Filter by tag
    if (tag) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM recommendation_tags rt3 
        JOIN tags t3 ON rt3.tag_id = t3.id 
        WHERE rt3.recommendation_id = r.id AND t3.name = ?
      )`;
      params.push(tag);
    }
    
    // Sort order
    const orderBy = sort === 'top' ? 'r.upvote_count DESC, r.created_at DESC' : 'r.created_at DESC';
    
    // Get total count
    const countResult = await all(`
      SELECT COUNT(DISTINCT r.id) as total 
      FROM recommendations r 
      WHERE ${whereClause}
    `, params);
    const total = countResult[0]?.total || 0;
    
    // Get recommendations
    const recommendations = await all(`
      SELECT 
        r.id,
        r.url,
        r.title,
        r.comment,
        r.upvote_count,
        r.created_at,
        r.user_id,
        u.nickname as user_nickname,
        (SELECT COUNT(*) FROM comments WHERE recommendation_id = r.id) as comment_count,
        (SELECT COUNT(*) FROM upvotes WHERE recommendation_id = r.id AND user_id = ?) as user_upvoted
      FROM recommendations r
      JOIN users u ON r.user_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [userId, ...params, parseInt(limit), offset]);
    
    // Get tags for each recommendation
    const result = [];
    for (const rec of recommendations) {
      const tags = await all(`
        SELECT t.name 
        FROM tags t
        JOIN recommendation_tags rt ON t.id = rt.tag_id
        WHERE rt.recommendation_id = ?
      `, [rec.id]);
      
      result.push({
        ...rec,
        tags: tags.map(t => t.name),
        userUpvoted: rec.user_upvoted > 0
      });
    }
    
    res.json({
      recommendations: result,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List recommendations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommendations/fetch-title - Fetch title for a URL
router.get('/fetch-title', requireAuth, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const title = await fetchTitle(url);
    res.json({ title: title || '' });
  } catch (error) {
    console.error('Fetch title error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/recommendations - Create recommendation
router.post('/', requireAuth, async (req, res) => {
  try {
    let { url, title, comment, tags } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Auto-fetch title if not provided
    if (!title) {
      title = await fetchTitle(url);
    }
    
    if (!title) {
      title = url; // Fallback to URL if title can't be fetched
    }
    
    // Create recommendation
    await run(
      'INSERT INTO recommendations (user_id, url, title, comment) VALUES (?, ?, ?, ?)',
      [req.session.userId, url, title, comment || null]
    );
    
    const recommendation = await get(
      'SELECT * FROM recommendations WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [req.session.userId]
    );
    
    // Handle tags
    const tagNames = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const normalizedTag = tagName.trim().toLowerCase();
        if (!normalizedTag) continue;
        
        // Get or create tag
        let tag = await get('SELECT * FROM tags WHERE name = ?', [normalizedTag]);
        
        if (!tag) {
          await run('INSERT INTO tags (name, created_by) VALUES (?, ?)', [normalizedTag, req.session.userId]);
          tag = await get('SELECT * FROM tags WHERE name = ?', [normalizedTag]);
        }
        
        // Link tag to recommendation
        await run(
          'INSERT INTO recommendation_tags (recommendation_id, tag_id) VALUES (?, ?)',
          [recommendation.id, tag.id]
        ).catch(() => {}); // Ignore duplicate key errors
        
        tagNames.push(normalizedTag);
      }
    }
    
    res.status(201).json({
      id: recommendation.id,
      url: recommendation.url,
      title: recommendation.title,
      comment: recommendation.comment,
      tags: tagNames,
      upvote_count: 0,
      created_at: recommendation.created_at
    });
  } catch (error) {
    console.error('Create recommendation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/recommendations/:id - Get single recommendation
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    
    const recommendation = await get(`
      SELECT 
        r.*,
        u.nickname as user_nickname,
        (SELECT COUNT(*) FROM upvotes WHERE recommendation_id = r.id AND user_id = ?) as user_upvoted
      FROM recommendations r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [userId, id]);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    const tags = await all(`
      SELECT t.name 
      FROM tags t
      JOIN recommendation_tags rt ON t.id = rt.tag_id
      WHERE rt.recommendation_id = ?
    `, [id]);
    
    res.json({
      ...recommendation,
      tags: tags.map(t => t.name),
      userUpvoted: recommendation.user_upvoted > 0
    });
  } catch (error) {
    console.error('Get recommendation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/recommendations/:id - Delete recommendation (own only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const recommendation = await get('SELECT * FROM recommendations WHERE id = ?', [id]);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    // Only owner or admin can delete
    if (recommendation.user_id !== req.session.userId && !req.session.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Delete related data
    await run('DELETE FROM recommendation_tags WHERE recommendation_id = ?', [id]);
    await run('DELETE FROM upvotes WHERE recommendation_id = ?', [id]);
    await run('DELETE FROM comments WHERE recommendation_id = ?', [id]);
    await run('DELETE FROM recommendations WHERE id = ?', [id]);
    
    res.json({ message: 'Recommendation deleted' });
  } catch (error) {
    console.error('Delete recommendation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
