// تزكيات (Tazkiyat) - Extension Popup Script

let currentUser = null;
let selectedTags = [];
let allTags = [];

// Views
const views = {
  loading: document.getElementById('loading'),
  login: document.getElementById('login-view'),
  submit: document.getElementById('submit-view'),
  success: document.getElementById('success-view'),
  settings: document.getElementById('settings-view')
};

// Elements
const errorEl = document.getElementById('error-message');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuth();
});

// Setup event listeners
function setupEventListeners() {
  // Popout button
  document.getElementById('popout-btn').addEventListener('click', handlePopout);
  
  // Settings button
  document.getElementById('settings-btn').addEventListener('click', showSettings);
  
  // Login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Submit form
  document.getElementById('submit-form').addEventListener('submit', handleSubmit);
  
  // Fetch title button
  document.getElementById('fetch-title-btn').addEventListener('click', fetchTitle);
  
  // Tags input
  const tagsInput = document.getElementById('tags-input');
  tagsInput.addEventListener('input', handleTagsInput);
  tagsInput.addEventListener('keydown', handleTagsKeydown);
  
  // Share another button
  document.getElementById('share-another-btn').addEventListener('click', () => {
    showView('submit');
    loadCurrentTab();
  });
  
  // Settings form
  document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
  document.getElementById('settings-cancel-btn').addEventListener('click', () => checkAuth());
}

// Show view helper
function showView(viewName) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
  hideError();
}

// Show/hide error
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function hideError() {
  errorEl.classList.add('hidden');
}

// Check authentication
async function checkAuth() {
  showView('loading');
  
  try {
    const result = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    
    if (result && result.user) {
      currentUser = result.user;
      document.getElementById('user-nickname').textContent = currentUser.nickname;
      showView('submit');
      loadCurrentTab();
      loadTags();
    } else {
      showView('login');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showView('login');
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  hideError();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  const result = await chrome.runtime.sendMessage({
    action: 'login',
    username,
    password
  });
  
  if (result.error) {
    showError(result.error);
    return;
  }
  
  currentUser = result.user;
  document.getElementById('user-nickname').textContent = currentUser.nickname;
  showView('submit');
  loadCurrentTab();
  loadTags();
}

// Handle logout
async function handleLogout() {
  await chrome.runtime.sendMessage({ action: 'logout' });
  currentUser = null;
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  showView('login');
}

// Load current tab info
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    document.getElementById('url').value = tab.url;
    document.getElementById('title').value = tab.title || '';
    document.getElementById('comment').value = '';
    selectedTags = [];
    renderSelectedTags();
  }
}

// Fetch title from server
async function fetchTitle() {
  const url = document.getElementById('url').value;
  const titleInput = document.getElementById('title');
  const btn = document.getElementById('fetch-title-btn');
  
  btn.textContent = 'Fetching...';
  btn.disabled = true;
  
  const result = await chrome.runtime.sendMessage({
    action: 'fetchTitle',
    url
  });
  
  btn.textContent = 'Auto-fetch';
  btn.disabled = false;
  
  if (result.title) {
    titleInput.value = result.title;
  }
}

// Load tags
async function loadTags() {
  const result = await chrome.runtime.sendMessage({ action: 'getTags' });
  allTags = result.tags || [];
}

// Handle tags input
async function handleTagsInput(e) {
  const value = e.target.value.trim().toLowerCase();
  const suggestionsEl = document.getElementById('tags-suggestions');
  
  if (!value) {
    suggestionsEl.classList.add('hidden');
    return;
  }
  
  // Filter existing tags and show suggestions
  const filtered = allTags.filter(tag => 
    tag.name.includes(value) && !selectedTags.includes(tag.name)
  ).slice(0, 5);
  
  // Check if exact match exists
  const exactMatch = allTags.find(t => t.name === value);
  const showCreateNew = !exactMatch && !selectedTags.includes(value);
  
  if (filtered.length === 0 && !showCreateNew) {
    suggestionsEl.classList.add('hidden');
    return;
  }
  
  let html = '';
  
  filtered.forEach(tag => {
    html += `<div class="tag-suggestion" data-tag="${escapeHtml(tag.name)}">
      ${escapeHtml(tag.name)} <span class="count">(${tag.usage_count})</span>
    </div>`;
  });
  
  if (showCreateNew) {
    html += `<div class="tag-suggestion" data-tag="${escapeHtml(value)}" data-new="true">
      Create "${escapeHtml(value)}"
    </div>`;
  }
  
  suggestionsEl.innerHTML = html;
  suggestionsEl.classList.remove('hidden');
  
  // Add click handlers
  suggestionsEl.querySelectorAll('.tag-suggestion').forEach(el => {
    el.addEventListener('click', () => {
      addTag(el.dataset.tag);
      document.getElementById('tags-input').value = '';
      suggestionsEl.classList.add('hidden');
    });
  });
}

// Handle tags keydown (enter to add)
function handleTagsKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const value = e.target.value.trim().toLowerCase();
    if (value && !selectedTags.includes(value)) {
      addTag(value);
      e.target.value = '';
      document.getElementById('tags-suggestions').classList.add('hidden');
    }
  }
}

// Add tag
function addTag(tagName) {
  if (!selectedTags.includes(tagName)) {
    selectedTags.push(tagName);
    renderSelectedTags();
  }
}

// Remove tag
function removeTag(tagName) {
  selectedTags = selectedTags.filter(t => t !== tagName);
  renderSelectedTags();
}

// Render selected tags
function renderSelectedTags() {
  const container = document.getElementById('selected-tags');
  container.innerHTML = selectedTags.map(tag => `
    <span class="tag">
      ${escapeHtml(tag)}
      <button type="button" onclick="removeTag('${escapeHtml(tag)}')">&times;</button>
    </span>
  `).join('');
}

// Handle submit
async function handleSubmit(e) {
  e.preventDefault();
  hideError();
  
  const url = document.getElementById('url').value;
  const title = document.getElementById('title').value.trim();
  const comment = document.getElementById('comment').value.trim();
  
  if (!url || !title) {
    showError('URL and title are required');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Sharing...';
  submitBtn.disabled = true;
  
  const result = await chrome.runtime.sendMessage({
    action: 'createRecommendation',
    data: {
      url,
      title,
      comment: comment || null,
      tags: selectedTags
    }
  });
  
  submitBtn.textContent = 'Share Recommendation';
  submitBtn.disabled = false;
  
  if (result.error) {
    showError(result.error);
    return;
  }
  
  // Success!
  showView('success');
}

// Handle popout - open popup in a new window
function handlePopout() {
  const popupUrl = chrome.runtime.getURL('popup/popup.html');
  chrome.windows.create({
    url: popupUrl,
    type: 'popup',
    width: 400,
    height: 600
  });
  window.close();
}

// Show settings
async function showSettings() {
  const result = await chrome.runtime.sendMessage({ action: 'getApiUrl' });
  document.getElementById('api-url').value = result.apiUrl || '';
  showView('settings');
}

// Handle save settings
async function handleSaveSettings(e) {
  e.preventDefault();
  
  const apiUrl = document.getElementById('api-url').value.trim();
  
  if (!apiUrl) {
    showError('Server URL is required');
    return;
  }
  
  await chrome.runtime.sendMessage({ action: 'setApiUrl', url: apiUrl });
  await checkAuth();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make removeTag available globally for onclick
window.removeTag = removeTag;
