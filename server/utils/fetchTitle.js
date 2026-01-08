const fetch = require('node-fetch');
const cheerio = require('cheerio');

async function fetchTitle(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try different title sources
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text() ||
                null;
    
    if (title) {
      title = title.trim().substring(0, 200); // Limit length
    }
    
    return title;
  } catch (error) {
    console.error('Error fetching title:', error.message);
    return null;
  }
}

module.exports = { fetchTitle };
