// تزكيات (Tazkiyat) - Auth Handler

// Check if user is logged in
async function checkAuth() {
  try {
    const user = await api.getMe();
    return user;
  } catch (error) {
    return null;
  }
}

// Redirect to login if not authenticated
async function requireAuth() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}

// Redirect to home if already authenticated
async function redirectIfAuth() {
  const user = await checkAuth();
  if (user) {
    window.location.href = '/';
    return true;
  }
  return false;
}

// Setup header with user info
function setupHeader(user) {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  
  // Clear existing nav
  nav.innerHTML = '';
  
  // Add navigation links
  const links = [
    { href: '/', text: 'Feed' },
    { href: '/stats.html', text: 'Stats' }
  ];
  
  if (user.isAdmin) {
    links.push({ href: '/admin.html', text: 'Admin' });
  }
  
  links.forEach(link => {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    if (window.location.pathname === link.href || 
        (link.href === '/' && window.location.pathname === '/index.html')) {
      a.classList.add('active');
    }
    nav.appendChild(a);
  });
  
  // Add user info and logout
  const userDiv = document.createElement('div');
  userDiv.className = 'nav-user';
  userDiv.innerHTML = `
    <span class="nickname">${escapeHtml(user.nickname)}</span>
    <button class="btn btn-small btn-secondary" onclick="logout()">Logout</button>
  `;
  nav.appendChild(userDiv);
}

// Logout
async function logout() {
  try {
    await api.logout();
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect anyway
    window.location.href = '/login.html';
  }
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility: Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// Utility: Show alert message
function showAlert(container, message, type = 'error') {
  // Remove existing alerts
  const existing = container.querySelector('.alert');
  if (existing) existing.remove();
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  container.insertBefore(alert, container.firstChild);
  
  // Auto-remove after 5 seconds for success
  if (type === 'success') {
    setTimeout(() => alert.remove(), 5000);
  }
}

// Utility: Extract domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
