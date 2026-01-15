# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

تزكيات (Tazkiyat) is a private recommendation-sharing platform for small groups. It consists of three main components:
1. **Backend API** (Node.js/Express) - handles data, auth, and business logic
2. **Frontend Web App** - static HTML/CSS/JS served by the backend
3. **Chrome Extension** - quick-share interface for browser

The app supports both SQLite (local dev) and PostgreSQL (production on Railway).

## Development Commands

### Server
```bash
# Install dependencies
cd server
npm install

# Start server (development or production)
npm start

# The server runs on port 3000 by default
# Access at: http://localhost:3000
```

### Chrome Extension
```bash
# No build step required - load unpacked in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/ folder
```

## Architecture

### Database Layer (`server/database.js`)

The database layer uses a **dual-mode architecture**:

- **SQLite mode** (local dev): Uses `sql.js` with file persistence at `./data/tazkiyat.db`
- **PostgreSQL mode** (production): Uses `pg` pool with connection from `DATABASE_URL` env var

**Key distinction**: The mode is detected automatically via `process.env.DATABASE_URL` presence. All database operations throughout the codebase check `isPostgres` and use different query methods:
- SQLite: `db.exec()` for writes, `db.exec()[0].values` for reads
- PostgreSQL: `await pgPool.query()` for all operations

The dual implementation exists in:
- `server/database.js` - initialization and table creation
- All route handlers in `server/routes/*` - CRUD operations

### Session Management

Sessions use `express-session` with critical CORS configuration for Chrome extension support:

```javascript
// CORS allows ALL origins with credentials
cors({
  origin: function(origin, callback) {
    return callback(null, true); // Allow everything
  },
  credentials: true
})

// Session cookie config varies by environment
cookie: {
  secure: NODE_ENV === 'production', // HTTPS only in prod
  httpOnly: false, // CRITICAL: allows extension JS access
  sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
  domain: NODE_ENV === 'production' ? undefined : 'localhost'
}
```

**Why this matters**: The Chrome extension needs to send cookies cross-origin. The `httpOnly: false` and `sameSite: 'none'` settings enable this but require HTTPS in production.

### Chrome Extension Architecture (`extension/`)

Uses Manifest V3 with:
- **Service Worker** (`background.js`): Handles all API calls, manages session state
- **Popup** (`popup/`): UI only, delegates all operations to background worker via `chrome.runtime.sendMessage()`

The API URL is stored in `chrome.storage.local` and defaults to Railway production URL. All network requests include `credentials: 'include'` to send session cookies.

### Route Organization

Routes are modular in `server/routes/`:
- `auth.js` - login, register, logout, password changes
- `admin.js` - invite code management, user management (admin-only)
- `recommendations.js` - create, list, delete recommendations with search/filter
- `tags.js` - tag creation and listing
- `comments.js` - comment CRUD on recommendations
- `upvotes.js` - toggle upvotes (one per user per recommendation)
- `stats.js` - platform statistics and leaderboards

All admin routes use `requireAdmin` middleware. All user routes use `requireAuth` middleware (defined in `server/middleware/auth.js`).

### Database Schema

Key relationships:
- **Users** → create **Recommendations** (one-to-many)
- **Users** → create **Invite Codes** (one-to-many)
- **Recommendations** → have many **Tags** (many-to-many via `recommendation_tags` junction)
- **Recommendations** → have many **Comments** (one-to-many)
- **Recommendations** → have many **Upvotes** (one-to-many, but constrained to one per user)

The `upvote_count` on recommendations is denormalized for performance - it's incremented/decremented when upvotes are toggled.

### Title Fetching

When a URL is shared, the backend auto-fetches the page title via `server/utils/fetchTitle.js`:
1. Fetches HTML with User-Agent header
2. Tries OG tags (`og:title`, `twitter:title`) first
3. Falls back to `<title>` tag
4. Limits to 200 characters
5. Returns null on error (frontend can prompt user to enter title manually)

This happens server-side to avoid CORS issues with the extension.

## Environment Variables

Required for production:
- `SESSION_SECRET` - cryptographic secret for session signing
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Railway)
- `ADMIN_PASSWORD` - initial admin password override

The `.env.example` file shows all available options.

## Railway Deployment

The project is configured for Railway deployment:
- `railway.json` - specifies Nixpacks builder and start command
- `Procfile` - defines web process
- Root `package.json` - ensures Railway runs `npm install` in `server/` subdirectory

**Critical setup**: Must add PostgreSQL database service in Railway dashboard before deployment. The `DATABASE_URL` env var triggers PostgreSQL mode automatically.

## Default Admin Account

On first run, a default admin is created:
- Username: `admin`
- Password: from `ADMIN_PASSWORD` env var or `admin123`
- Nickname: `Atom_Ant`
- Admin flag: `true`

Check `server/database.js` (around line 200+) for the creation logic.

## Testing Notes

No automated test suite exists. Manual testing workflow:
1. Start server locally with SQLite
2. Test web interface at `http://localhost:3000`
3. Load Chrome extension and point it to `http://localhost:3000`
4. Create recommendations, test search/filter, verify upvotes/comments

For production testing, the extension must point to the Railway URL via settings.
