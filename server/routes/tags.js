const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');
const { requireAuth } = require('../middleware/auth');

// GET /api/tags - List all tags (with optional search)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT 
        t.id,
        t.name,
        (SELECT COUNT(*) FROM recommendation_tags WHERE tag_id = t.id) as usage_count
      FROM tags t
    `;
    
    let params = [];
    
    if (search) {
      query += ' WHERE t.name LIKE ?';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY usage_count DESC, t.name ASC';
    
    const tags = await all(query, params);
    res.json(tags);
  } catch (error) {
    console.error('List tags error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tags - Create a new tag
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name required' });
    }
    
    const normalizedName = name.trim().toLowerCase();
    
    // Check if exists
    const existing = await get('SELECT * FROM tags WHERE name = ?', [normalizedName]);
    
    if (existing) {
      return res.json(existing); // Return existing tag
    }
    
    await run('INSERT INTO tags (name, created_by) VALUES (?, ?)', [normalizedName, req.session.userId]);
    
    const tag = await get('SELECT * FROM tags WHERE name = ?', [normalizedName]);
    res.status(201).json(tag);
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
