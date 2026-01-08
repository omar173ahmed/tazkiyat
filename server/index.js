const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const recommendationsRoutes = require('./routes/recommendations');
const tagsRoutes = require('./routes/tags');
const commentsRoutes = require('./routes/comments');
const upvotesRoutes = require('./routes/upvotes');
const statsRoutes = require('./routes/stats');

const app = express();

// Trust proxy for Railway (needed for secure cookies behind proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Serve static files from web directory
app.use(express.static(path.join(__dirname, '../web')));

// Health check for Railway (before other routes)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/upvotes', upvotesRoutes);
app.use('/api/stats', statsRoutes);

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    
    const PORT = process.env.PORT || config.PORT;
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('==========================================');
      console.log(`   تزكيات (Tazkiyat) Server Running`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('==========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
