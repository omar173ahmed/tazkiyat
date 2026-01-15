// تزكيات (Tazkiyat) - Feed Handler

let currentUser = null;
let currentSort = 'newest';
let currentSearch = '';
let currentTag = null;
let currentPage = 1;
let allTags = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  
  setupHeader(currentUser);
  setupEventListeners();
  loadTags();
  loadFeed();
});

// Setup event listeners
function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadFeed();
    }, 300);
  });

  // Sort toggle
  document.getElementById('sort-newest').addEventListener('click', () => {
    setSort('newest');
  });
  
  document.getElementById('sort-top').addEventListener('click', () => {
    setSort('top');
  });
}

// Set sort order
function setSort(sort) {
  currentSort = sort;
  currentPage = 1;
  
  document.querySelectorAll('.sort-toggle button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`sort-${sort}`).classList.add('active');
  
  loadFeed();
}

// Load tags for filter
async function loadTags() {
  try {
    allTags = await api.getTags();
    renderTagsFilter();
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
}

// Render tags filter
function renderTagsFilter() {
  const container = document.getElementById('tags-filter');
  
  // Show top 10 most used tags
  const topTags = allTags.slice(0, 10);
  
  if (topTags.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = topTags.map(tag => `
    <span class="tag ${currentTag === tag.name ? 'active' : ''}" 
          onclick="filterByTag('${escapeHtml(tag.name)}')"
          title="${tag.usage_count} recommendations">
      ${escapeHtml(tag.name)}
    </span>
  `).join('');
  
  // Add "clear filter" if filtering
  if (currentTag) {
    container.innerHTML += `
      <span class="tag" onclick="clearTagFilter()" style="background: var(--error);">
        Clear filter
      </span>
    `;
  }
}

// Filter by tag
function filterByTag(tagName) {
  if (currentTag === tagName) {
    clearTagFilter();
  } else {
    currentTag = tagName;
    currentPage = 1;
    renderTagsFilter();
    loadFeed();
  }
}

// Clear tag filter
function clearTagFilter() {
  currentTag = null;
  currentPage = 1;
  renderTagsFilter();
  loadFeed();
}

// Load feed
async function loadFeed() {
  const feedContainer = document.getElementById('feed');
  feedContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
  
  try {
    const result = await api.getRecommendations({
      search: currentSearch,
      tag: currentTag,
      sort: currentSort,
      page: currentPage,
      limit: 20
    });
    
    renderFeed(result.recommendations);
    renderPagination(result.pagination);
  } catch (error) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <h3>Error loading feed</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

// Render feed
function renderFeed(recommendations) {
  const container = document.getElementById('feed');
  
  if (recommendations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No recommendations yet</h3>
        <p>Be the first to share something using the Chrome extension!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recommendations.map(rec => renderRecommendationCard(rec)).join('');
}

// Render single recommendation card
function renderRecommendationCard(rec) {
  const domain = getDomain(rec.url);
  const tagsHtml = rec.tags.map(tag => `
    <span class="tag" onclick="filterByTag('${escapeHtml(tag)}')">${escapeHtml(tag)}</span>
  `).join('');
  
  return `
    <div class="recommendation-card" data-id="${rec.id}">
      <div class="rec-header">
        <div>
          <div class="rec-title">
            <a href="${escapeHtml(rec.url)}" target="_blank" rel="noopener" dir="auto">${escapeHtml(rec.title)}</a>
          </div>
          <div class="rec-url">${escapeHtml(domain)}</div>
        </div>
      </div>
      
      ${rec.comment ? `<div class="rec-comment" dir="auto">${escapeHtml(rec.comment)}</div>` : ''}
      
      ${tagsHtml ? `<div class="rec-tags">${tagsHtml}</div>` : ''}
      
      <div class="rec-meta">
        <span>by <span class="rec-author">${escapeHtml(rec.user_nickname)}</span></span>
        <span>${formatDate(rec.created_at)}</span>
      </div>
      
      <div class="rec-actions">
        <button class="action-btn ${rec.userUpvoted ? 'upvoted' : ''}" onclick="toggleUpvote(${rec.id})">
          <span>${rec.userUpvoted ? '▲' : '△'}</span>
          <span class="count">${rec.upvote_count}</span>
          <span>upvotes</span>
        </button>
        <button class="action-btn" onclick="toggleComments(${rec.id})">
          <span>💬</span>
          <span class="count">${rec.comment_count}</span>
          <span>comments</span>
        </button>
        ${rec.user_id === currentUser.id || currentUser.isAdmin ? `
          <button class="action-btn" onclick="deleteRecommendation(${rec.id})" style="margin-left: auto; color: var(--error);">
            Delete
          </button>
        ` : ''}
      </div>
      
      <div class="comments-section hidden" id="comments-${rec.id}">
        <div class="comments-list" id="comments-list-${rec.id}">
          <div class="loading"><div class="spinner"></div></div>
        </div>
        <form class="comment-form" onsubmit="addComment(event, ${rec.id})">
          <input type="text" placeholder="Write a comment..." required>
          <button type="submit" class="btn btn-small btn-primary">Post</button>
        </form>
      </div>
    </div>
  `;
}

// Toggle upvote
async function toggleUpvote(recId) {
  try {
    const result = await api.toggleUpvote(recId);
    
    // Update UI
    const card = document.querySelector(`.recommendation-card[data-id="${recId}"]`);
    const btn = card.querySelector('.action-btn');
    const countSpan = btn.querySelector('.count');
    const arrowSpan = btn.querySelector('span:first-child');
    
    countSpan.textContent = result.upvote_count;
    
    if (result.upvoted) {
      btn.classList.add('upvoted');
      arrowSpan.textContent = '▲';
    } else {
      btn.classList.remove('upvoted');
      arrowSpan.textContent = '△';
    }
  } catch (error) {
    alert('Failed to update vote: ' + error.message);
  }
}

// Toggle comments
async function toggleComments(recId) {
  const section = document.getElementById(`comments-${recId}`);
  
  if (section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    loadComments(recId);
  } else {
    section.classList.add('hidden');
  }
}

// Load comments
async function loadComments(recId) {
  const list = document.getElementById(`comments-list-${recId}`);
  
  try {
    const comments = await api.getComments(recId);
    
    if (comments.length === 0) {
      list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No comments yet</p>';
      return;
    }
    
    list.innerHTML = comments.map(c => `
      <div class="comment" data-id="${c.id}">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(c.user_nickname)}</span>
          <span class="comment-date">${formatDate(c.created_at)}</span>
        </div>
        <div class="comment-content" dir="auto">${escapeHtml(c.content)}</div>
        ${c.user_id === currentUser.id || currentUser.isAdmin ? `
          <button class="btn-icon" onclick="deleteComment(${c.id}, ${recId})" style="font-size: 0.75rem; color: var(--error);">Delete</button>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = '<p style="color: var(--error);">Failed to load comments</p>';
  }
}

// Add comment
async function addComment(event, recId) {
  event.preventDefault();
  
  const form = event.target;
  const input = form.querySelector('input');
  const content = input.value.trim();
  
  if (!content) return;
  
  try {
    await api.addComment(recId, content);
    input.value = '';
    loadComments(recId);
    
    // Update comment count in card
    const card = document.querySelector(`.recommendation-card[data-id="${recId}"]`);
    const countSpan = card.querySelector('.action-btn:nth-child(2) .count');
    countSpan.textContent = parseInt(countSpan.textContent) + 1;
  } catch (error) {
    alert('Failed to add comment: ' + error.message);
  }
}

// Delete comment
async function deleteComment(commentId, recId) {
  if (!confirm('Delete this comment?')) return;
  
  try {
    await api.deleteComment(commentId);
    loadComments(recId);
    
    // Update comment count
    const card = document.querySelector(`.recommendation-card[data-id="${recId}"]`);
    const countSpan = card.querySelector('.action-btn:nth-child(2) .count');
    countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
  } catch (error) {
    alert('Failed to delete comment: ' + error.message);
  }
}

// Delete recommendation
async function deleteRecommendation(recId) {
  if (!confirm('Delete this recommendation?')) return;
  
  try {
    await api.deleteRecommendation(recId);
    loadFeed();
  } catch (error) {
    alert('Failed to delete: ' + error.message);
  }
}

// Render pagination
function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  
  if (pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <button onclick="goToPage(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}>
      Previous
    </button>
    <span class="page-info">
      Page ${pagination.page} of ${pagination.totalPages}
    </span>
    <button onclick="goToPage(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''}>
      Next
    </button>
  `;
}

// Go to page
function goToPage(page) {
  currentPage = page;
  loadFeed();
  window.scrollTo(0, 0);
}
