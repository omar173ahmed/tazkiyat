// تزكيات (Tazkiyat) - API Client

const API_BASE = '/api';

class API {
  // Helper method for requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { username, password }
    });
  }

  async register(inviteCode, username, nickname, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { inviteCode, username, nickname, password }
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword }
    });
  }

  // Recommendations
  async getRecommendations({ search, tag, sort, page, limit } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    if (sort) params.append('sort', sort);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    
    const query = params.toString();
    return this.request(`/recommendations${query ? `?${query}` : ''}`);
  }

  async getRecommendation(id) {
    return this.request(`/recommendations/${id}`);
  }

  async createRecommendation(url, title, comment, tags) {
    return this.request('/recommendations', {
      method: 'POST',
      body: { url, title, comment, tags }
    });
  }

  async deleteRecommendation(id) {
    return this.request(`/recommendations/${id}`, { method: 'DELETE' });
  }

  async fetchTitle(url) {
    return this.request(`/recommendations/fetch-title?url=${encodeURIComponent(url)}`);
  }

  // Tags
  async getTags(search) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/tags${query}`);
  }

  async createTag(name) {
    return this.request('/tags', {
      method: 'POST',
      body: { name }
    });
  }

  // Comments
  async getComments(recommendationId) {
    return this.request(`/comments/${recommendationId}`);
  }

  async addComment(recommendationId, content) {
    return this.request(`/comments/${recommendationId}`, {
      method: 'POST',
      body: { content }
    });
  }

  async deleteComment(id) {
    return this.request(`/comments/${id}`, { method: 'DELETE' });
  }

  // Upvotes
  async toggleUpvote(recommendationId) {
    return this.request(`/upvotes/${recommendationId}/toggle`, { method: 'POST' });
  }

  // Stats
  async getStats() {
    return this.request('/stats');
  }

  // Admin
  async createInvites(count = 1) {
    return this.request('/admin/invites', {
      method: 'POST',
      body: { count }
    });
  }

  async getInvites() {
    return this.request('/admin/invites');
  }

  async deleteInvite(code) {
    return this.request(`/admin/invites/${code}`, { method: 'DELETE' });
  }

  async getUsers() {
    return this.request('/admin/users');
  }

  async deleteUser(id) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }
}

// Global API instance
const api = new API();
