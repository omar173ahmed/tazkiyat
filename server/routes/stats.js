const express = require('express');
const router = express.Router();
const { all, get } = require('../database');
const { requireAuth } = require('../middleware/auth');

// GET /api/stats - Get platform statistics
router.get('/', requireAuth, async (req, res) => {
  try {
    // Total counts
    const totalUsersResult = await get('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult?.count || 0;
    
    const totalRecommendationsResult = await get('SELECT COUNT(*) as count FROM recommendations');
    const totalRecommendations = totalRecommendationsResult?.count || 0;
    
    const totalCommentsResult = await get('SELECT COUNT(*) as count FROM comments');
    const totalComments = totalCommentsResult?.count || 0;
    
    const totalUpvotesResult = await get('SELECT COUNT(*) as count FROM upvotes');
    const totalUpvotes = totalUpvotesResult?.count || 0;
    
    // Top contributors (by recommendation count)
    const topContributors = await all(`
      SELECT 
        u.id,
        u.nickname,
        COUNT(r.id) as recommendation_count
      FROM users u
      LEFT JOIN recommendations r ON u.id = r.user_id
      GROUP BY u.id, u.nickname
      ORDER BY recommendation_count DESC
      LIMIT 10
    `);
    
    // Most active commenters
    const topCommenters = await all(`
      SELECT 
        u.id,
        u.nickname,
        COUNT(c.id) as comment_count
      FROM users u
      LEFT JOIN comments c ON u.id = c.user_id
      GROUP BY u.id, u.nickname
      HAVING COUNT(c.id) > 0
      ORDER BY comment_count DESC
      LIMIT 10
    `);
    
    // Most popular tags
    const popularTags = await all(`
      SELECT 
        t.name,
        COUNT(rt.recommendation_id) as usage_count
      FROM tags t
      JOIN recommendation_tags rt ON t.id = rt.tag_id
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC
      LIMIT 15
    `);
    
    // Most upvoted recommendations
    const mostUpvoted = await all(`
      SELECT 
        r.id,
        r.title,
        r.url,
        r.upvote_count,
        u.nickname as user_nickname
      FROM recommendations r
      JOIN users u ON r.user_id = u.id
      WHERE r.upvote_count > 0
      ORDER BY r.upvote_count DESC
      LIMIT 10
    `);
    
    // Recent activity (recommendations this week)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();
    
    const recentRecommendationsResult = await get(
      'SELECT COUNT(*) as count FROM recommendations WHERE created_at >= ?',
      [weekAgoStr]
    );
    const recentRecommendations = recentRecommendationsResult?.count || 0;
    
    const recentCommentsResult = await get(
      'SELECT COUNT(*) as count FROM comments WHERE created_at >= ?',
      [weekAgoStr]
    );
    const recentComments = recentCommentsResult?.count || 0;
    
    // Personal stats for current user
    const userId = req.session.userId;
    
    const myRecommendationsResult = await get(
      'SELECT COUNT(*) as count FROM recommendations WHERE user_id = ?',
      [userId]
    );
    const myRecommendations = myRecommendationsResult?.count || 0;
    
    const myCommentsResult = await get(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ?',
      [userId]
    );
    const myComments = myCommentsResult?.count || 0;
    
    const myUpvotesReceivedResult = await get(`
      SELECT COALESCE(SUM(r.upvote_count), 0) as count 
      FROM recommendations r 
      WHERE r.user_id = ?
    `, [userId]);
    const myUpvotesReceived = myUpvotesReceivedResult?.count || 0;
    
    res.json({
      overview: {
        totalUsers,
        totalRecommendations,
        totalComments,
        totalUpvotes
      },
      thisWeek: {
        recommendations: recentRecommendations,
        comments: recentComments
      },
      topContributors,
      topCommenters,
      popularTags,
      mostUpvoted,
      personal: {
        recommendations: myRecommendations,
        comments: myComments,
        upvotesReceived: myUpvotesReceived
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
