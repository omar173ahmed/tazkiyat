# تزكيات (Tazkiyat)

A private recommendation-sharing platform for small groups of friends. Share links, add tags, comment, and upvote recommendations.

## Features

- **Invite-only registration** - You control who joins
- **Link sharing** via Chrome extension
- **Auto-fetch titles** from URLs
- **User-created tags** for organization
- **Comments & upvotes** for engagement
- **Stats page** with leaderboards
- **Dark theme** minimalist UI

---

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Run the Server

```bash
npm start
```

The server will start at `http://localhost:3000`

### 3. First Login

On first run, a default admin account is created:
- **Username:** `admin`
- **Password:** `admin123`
- **Nickname:** `Atom_Ant`

**Change this password immediately!**

### 4. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension icon should appear in your toolbar

### 5. Invite Friends

1. Login to the website as admin
2. Go to the Admin panel
3. Generate invite codes
4. Share codes with friends

---

## Deploy to Railway

### Step 1: Create GitHub Repository

```bash
# In the project root folder
git init
git add .
git commit -m "Initial commit - تزكيات (Tazkiyat)"
```

Create a new repository on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/tazkiyat.git
git branch -M main
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your `tazkiyat` repository

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for it to provision (takes ~30 seconds)

### Step 4: Set Environment Variables

In Railway dashboard:
1. Click on your service (not the database)
2. Go to **"Variables"** tab
3. Add these variables:

| Variable | Value |
|----------|-------|
| `SESSION_SECRET` | A random string (use: `openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | Your secure admin password |
| `NODE_ENV` | `production` |

**Note:** `DATABASE_URL` is automatically provided by Railway when you add PostgreSQL.

### Step 5: Deploy

Railway will automatically detect the `railway.json` config and deploy.

Wait for the deployment to complete (check the "Deployments" tab).

### Step 6: Get Your URL

1. Go to **"Settings"** tab
2. Under **"Domains"**, click **"Generate Domain"**
3. Your app will be available at: `https://YOUR-APP.up.railway.app`

### Step 7: Update Chrome Extension

After deploying, update the Chrome extension to use your Railway URL:

1. Click the extension icon
2. Click the settings (⚙️) button
3. Enter your Railway URL (e.g., `https://tazkiyat-production.up.railway.app`)
4. Save

---

## Project Structure

```
tazkiyat/
├── server/           # Backend API (Node.js + Express)
│   ├── routes/       # API endpoints
│   ├── middleware/   # Auth middleware
│   ├── utils/        # Utility functions
│   ├── config.js     # Configuration
│   ├── database.js   # SQLite/PostgreSQL setup
│   └── index.js      # Entry point
│
├── web/              # Frontend website
│   ├── css/          # Styles
│   ├── js/           # JavaScript
│   ├── index.html    # Home feed
│   ├── login.html    # Login page
│   ├── register.html # Registration page
│   ├── stats.html    # Statistics page
│   └── admin.html    # Admin panel
│
├── extension/        # Chrome extension
│   ├── popup/        # Extension popup UI
│   ├── background.js # Service worker
│   └── manifest.json # Extension config
│
└── railway.json      # Railway deployment config
```

---

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register with invite code
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password

### Recommendations
- `GET /api/recommendations` - List (with search, filter, sort)
- `GET /api/recommendations/:id` - Get single recommendation
- `POST /api/recommendations` - Create new
- `DELETE /api/recommendations/:id` - Delete

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Comments
- `GET /api/comments/:recId` - Get comments
- `POST /api/comments/:recId` - Add comment
- `DELETE /api/comments/:id` - Delete comment

### Upvotes
- `POST /api/upvotes/:recId/toggle` - Toggle upvote

### Stats
- `GET /api/stats` - Get platform statistics

### Admin
- `POST /api/admin/invites` - Generate invite codes
- `GET /api/admin/invites` - List invite codes
- `DELETE /api/admin/invites/:code` - Delete invite code
- `GET /api/admin/users` - List users
- `DELETE /api/admin/users/:id` - Delete user

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `SESSION_SECRET` | Secret for session encryption | Yes (production) |
| `ADMIN_PASSWORD` | Initial admin password | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes (Railway) |
| `NODE_ENV` | Environment (`production` / `development`) | No |

---

## License

Private use only.
