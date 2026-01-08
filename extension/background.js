// تزكيات (Tazkiyat) - Background Service Worker

// Default API URL (can be changed in popup settings)
const DEFAULT_API_URL = 'https://tazkiyat-production.up.railway.app';

// Get API URL from storage
async function getApiUrl() {
  const result = await chrome.storage.local.get(['apiUrl']);
  return result.apiUrl || DEFAULT_API_URL;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request) {
  const apiUrl = await getApiUrl();
  
  switch (request.action) {
    case 'login':
      return await login(apiUrl, request.username, request.password);
    
    case 'logout':
      return await logout(apiUrl);
    
    case 'checkAuth':
      return await checkAuth(apiUrl);
    
    case 'getTags':
      return await getTags(apiUrl, request.search);
    
    case 'createRecommendation':
      return await createRecommendation(apiUrl, request.data);
    
    case 'fetchTitle':
      return await fetchTitle(apiUrl, request.url);
    
    case 'setApiUrl':
      await chrome.storage.local.set({ apiUrl: request.url });
      return { success: true };
    
    case 'getApiUrl':
      return { apiUrl };
    
    default:
      return { error: 'Unknown action' };
  }
}

async function login(apiUrl, username, password) {
  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ username, password })
    });
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { error: 'Server returned non-JSON response. Check API URL in settings.' };
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.error || 'Login failed' };
    }
    
    // Store user info
    await chrome.storage.local.set({ user: data });
    return { user: data };
  } catch (error) {
    return { error: `Connection failed: ${error.message}. Check your API URL in settings.` };
  }
}

async function logout(apiUrl) {
  try {
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    await chrome.storage.local.remove(['user']);
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkAuth(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      await chrome.storage.local.remove(['user']);
      return { user: null };
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await chrome.storage.local.remove(['user']);
      return { user: null };
    }
    
    const user = await response.json();
    await chrome.storage.local.set({ user });
    return { user };
  } catch (error) {
    return { user: null };
  }
}

async function getTags(apiUrl, search) {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`${apiUrl}/api/tags${query}`, {
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      return { tags: [] };
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { tags: [] };
    }
    
    const tags = await response.json();
    return { tags };
  } catch (error) {
    return { tags: [] };
  }
}

async function createRecommendation(apiUrl, data) {
  try {
    const response = await fetch(`${apiUrl}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(data)
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { error: 'Server returned invalid response' };
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error || 'Failed to create recommendation' };
    }
    
    return { recommendation: result };
  } catch (error) {
    return { error: error.message };
  }
}

async function fetchTitle(apiUrl, url) {
  try {
    const response = await fetch(`${apiUrl}/api/recommendations/fetch-title?url=${encodeURIComponent(url)}`, {
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      return { title: '' };
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { title: '' };
    }
    
    const data = await response.json();
    return { title: data.title || '' };
  } catch (error) {
    return { title: '' };
  }
}
