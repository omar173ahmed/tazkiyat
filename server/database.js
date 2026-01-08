const bcrypt = require('bcryptjs');
const config = require('./config');

// Detect if we're using PostgreSQL (Railway) or SQLite (local)
const isPostgres = !!process.env.DATABASE_URL;

let db = null;
let pgPool = null;

async function initDatabase() {
  if (isPostgres) {
    await initPostgres();
  } else {
    await initSQLite();
  }
  
  await createTables();
  await createDefaultAdmin();
  
  return db || pgPool;
}

// SQLite initialization (local development)
async function initSQLite() {
  const initSqlJs = require('sql.js');
  const fs = require('fs');
  const path = require('path');
  
  // Ensure data directory exists
  const dataDir = path.dirname(config.DATABASE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(config.DATABASE_PATH)) {
    const fileBuffer = fs.readFileSync(config.DATABASE_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('Loaded existing SQLite database');
  } else {
    db = new SQL.Database();
    console.log('Created new SQLite database');
  }
}

// PostgreSQL initialization (Railway production)
async function initPostgres() {
  const { Pool } = require('pg');
  
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log('Connected to PostgreSQL database');
}

// Create tables
async function createTables() {
  if (isPostgres) {
    // PostgreSQL tables
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        nickname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        used_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        comment TEXT,
        upvote_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id)
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS recommendation_tags (
        recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id),
        PRIMARY KEY (recommendation_id, tag_id)
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS upvotes (
        user_id INTEGER NOT NULL REFERENCES users(id),
        recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, recommendation_id)
      )
    `);
    
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    // SQLite tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        used_by INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        used_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (used_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        comment TEXT,
        upvote_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS recommendation_tags (
        recommendation_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (recommendation_id, tag_id),
        FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS upvotes (
        user_id INTEGER NOT NULL,
        recommendation_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, recommendation_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recommendation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    saveDatabase();
  }
}

// Create default admin
async function createDefaultAdmin() {
  let userCount;
  
  if (isPostgres) {
    const result = await pgPool.query('SELECT COUNT(*) as count FROM users');
    userCount = parseInt(result.rows[0].count);
  } else {
    const result = db.exec('SELECT COUNT(*) as count FROM users')[0];
    userCount = result ? result.values[0][0] : 0;
  }
  
  if (userCount === 0) {
    const passwordHash = await bcrypt.hash(config.DEFAULT_ADMIN_PASSWORD, 10);
    
    if (isPostgres) {
      await pgPool.query(
        'INSERT INTO users (username, nickname, password_hash, is_admin) VALUES ($1, $2, $3, TRUE)',
        [config.DEFAULT_ADMIN_USERNAME, 'Atom_Ant', passwordHash]
      );
    } else {
      db.run(
        'INSERT INTO users (username, nickname, password_hash, is_admin) VALUES (?, ?, ?, 1)',
        [config.DEFAULT_ADMIN_USERNAME, 'Atom_Ant', passwordHash]
      );
      saveDatabase();
    }
    
    console.log('==========================================');
    console.log('Default admin account created!');
    console.log(`Username: ${config.DEFAULT_ADMIN_USERNAME}`);
    console.log(`Password: ${config.DEFAULT_ADMIN_PASSWORD}`);
    console.log(`Nickname: Atom_Ant`);
    console.log('PLEASE CHANGE THE PASSWORD AFTER FIRST LOGIN!');
    console.log('==========================================');
  }
}

// Save SQLite database to file
function saveDatabase() {
  if (db && !isPostgres) {
    const fs = require('fs');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.DATABASE_PATH, buffer);
  }
}

// Database helper functions
function run(sql, params = []) {
  if (isPostgres) {
    // Convert ? placeholders to $1, $2, etc for PostgreSQL
    let pgSql = sql;
    let i = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${i++}`);
    }
    return pgPool.query(pgSql, params);
  } else {
    db.run(sql, params);
    saveDatabase();
  }
}

function get(sql, params = []) {
  if (isPostgres) {
    // Convert ? placeholders to $1, $2, etc for PostgreSQL
    let pgSql = sql;
    let i = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${i++}`);
    }
    return pgPool.query(pgSql, params).then(result => {
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    });
  } else {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }
}

function all(sql, params = []) {
  if (isPostgres) {
    // Convert ? placeholders to $1, $2, etc for PostgreSQL
    let pgSql = sql;
    let i = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${i++}`);
    }
    return pgPool.query(pgSql, params).then(result => result.rows);
  } else {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

function getDb() {
  return isPostgres ? pgPool : db;
}

module.exports = {
  initDatabase,
  saveDatabase,
  getDb,
  run,
  get,
  all,
  isPostgres
};
