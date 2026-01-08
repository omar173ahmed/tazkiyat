// Configuration for تزكيات (Tazkiyat)
module.exports = {
  PORT: process.env.PORT || 3000,
  SESSION_SECRET: process.env.SESSION_SECRET || 'tazkiyat-secret-change-in-production',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/tazkiyat.db',
  DEFAULT_ADMIN_USERNAME: 'admin',
  DEFAULT_ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123', // Change on first login!
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
};
