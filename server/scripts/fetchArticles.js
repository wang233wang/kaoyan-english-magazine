const RssParser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const parser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

const DATA_DIR = path.join(__dirname, '..', 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');

const RSS_SOURCES = [
  {
    name: 'NPR - World',
    url: 'https://feeds.npr.org/1004/rss.xml',
    category: '新闻',
    icon: '🌎'
  },
  {
    name: 'NPR - Science',
    url: 'https://feeds.npr.org/1007/rss.xml',
    category: '科学',
    icon: '🔬'
  },
  {
    name: 'NPR - Technology',
    url: 'https://feeds.npr.org/1019/rss.xml',
    category: '科技',
    icon: '💻'
  },
  {
    name: 'NPR - Books',
    url: 'https://feeds.npr.org/1032/rss.xml',
    category: '文化',
    icon: '📚'
  },
  {
    name: 'NPR - Business',
    url: 'https://feeds.npr.org/1006/rss.xml',
    category: '经济',
    icon: '💰'
  },
  {
    name: 'NPR - Health',
    url: 'https://feeds.npr.org/1027/rss.xml',
    category: '健康',
    icon: '🏥'
  },
  {
    name: 'BBC - World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: '新闻',
    icon: '📻'
  },
  {
    name: 'BBC - Science',
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    category: '科学',
    icon: '🧪'
  },
  {
    name: 'BBC - Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    category: '科技',
    icon: '🔧'
  },
  {
    name: 'China Daily - World',
    url: 'https://www.chinadaily.com.cn/rss/world_rss.xml',
    category: '新闻',
    icon: '🇨🇳'
  },
  {
    name: 'China Daily - Opinion',
    url: 'https://www.chinadaily.com.cn/rss/opinion_rss.xml',
    category: '评论',
    icon: '💬'
  },
  {
    name: 'China Daily - Culture',
    url: 'https://www.chinadaily.com.cn/rss/culture_rss.xml',
    category: '文化',
    icon: '🎭'
  },
  {
    name: 'China Daily - Sports',
    url: 'https://www.chinadaily.com.cn/rss/sports_rss.xml',
    category: '体育',
    icon: '⚽'
  },
  {
    name: 'China Daily - China',
    url: 'https://www.chinadaily.com.cn/rss/china_rss.xml',
    category: '国内',
    icon: '🏯'
  },
  {
    name: 'China Daily - Lifestyle',
    url: 'https://www.chinadaily.com.cn/rss/lifestyle_rss.xml',
    category: '生活',
    icon: '🌿'
  }
];

function loadArticles() {
  try {
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading articles:', e.message);
  }
  return { articles: [], lastUpdate: null };
}

function saveArticles(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstImage(content) {
  if (!content) return '';
  const match = content.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : '';
}

function cleanArticleContent(text) {
  if (!text) return '';
  let cleaned = text;
  
  // Remove image captions
  cleaned = cleaned.replace(/(?:AP|Reuters|Getty|AFP|Shutterstock|File)\s*(?:photo|image|picture)?\.?\s*/gi, '');
  cleaned = cleaned.replace(/(?:Bebeto|Carlos|John|Mike|Sarah|David|Mark|Chris|Jim|Tom|Dan)\s+\w+\/(?:AP|Reuters|Getty|AFP)\s*/g, '');
  cleaned = cleaned.replace(/hide caption\s*/gi, '');
  cleaned = cleaned.replace(/toggle caption\s*/gi, '');
  cleaned = cleaned.replace(/Credit:\s*[^.]+\.?\s*/gi, '');
  cleaned = cleaned.replace(/Photo(?:graph)?(?:\s*by)?:\s*[^.]+\.?\s*/gi, '');
  
  // Remove timestamps
  cleaned = cleaned.replace(/\d{1,2}:\d{2}\s*(?:AM|PM|a\.m\.|p\.m\.)\s*(?:ET|EST|PST|CST|GMT|UTC)?\s*/gi, '');
  cleaned = cleaned.replace(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,\s+\w+\s+\d{1,2},?\s+\d{4}\s*/gi, '');
  cleaned = cleaned.replace(/\w+\s+\d{1,2},?\s+\d{4}\s*/g, match => {
    if (match.match(/^\w+\s+\d{1,2},?\s+\d{4}$/)) return '';
    return match;
  });
  
  // Remove "By Author" patterns
  cleaned = cleaned.replace(/(?:By|Written by|Author|Reported by)\s+[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+(?:and|for|of|at|in|from|via)\s+\w+)*\.?\s*/g, '');
  cleaned = cleaned.replace(/By\s+The\s+Associated\s+Press\s*/gi, '');
  cleaned = cleaned.replace(/By\s+The\s+New\s+York\s+Times\s*/gi, '');
  
  // Remove source attributions
  cleaned = cleaned.replace(/\((?:：|；|，)\s*(?:Source|来源)[^)]*\)/gi, '');
  cleaned = cleaned.replace(/—\s*(?:The|A)\s+\w+\s+(?:Post|Times|Guardian|Journal|News|Review|Magazine|Tribune)\s*/g, '');
  
  // Remove common boilerplate
  cleaned = cleaned.replace(/This\s+(?:story|article|post)\s+was\s+(?:originally|first)\s+published\s+(?:on|at|by)[^.]+\./gi, '');
  cleaned = cleaned.replace(/Updated?\s*:?\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*/gi, '');
  cleaned = cleaned.replace(/Published\s*:?\s*/gi, '');
  cleaned = cleaned.replace(/Last\s+Updated?\s*:?\s*/gi, '');
  
  // Remove "more" links
  cleaned = cleaned.replace(/\.\.\.\s*more\s*/gi, '... ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/^\s*[,\s.]+|[,\s.]+\s*$/g, '');
  
  return cleaned.trim();
}

async function fetchFullContent(url) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar, .related, .comments, .social-share, figure figcaption, .caption, .credit, .byline, .author, .timestamp, .dateline, .social-media, .newsletter-signup, .subscription-cta').remove();

    const selectors = [
      'article .article-body',
      'article .article-content',
      'article',
      '.article-content',
      '.article-body',
      '.post-content',
      '.entry-content',
      '.content-area',
      '[role="main"]'
    ];

    let content = '';
    for (const sel of selectors) {
      const el = $(sel);
      if (el.length) {
        const paragraphs = [];
        el.find('p').each((i, p) => {
          const text = $(p).text().trim();
          if (text.length > 30 && !text.match(/^(?:Photo|Image|Credit|Source|By\s|©)/i)) {
            paragraphs.push(text);
          }
        });
        if (paragraphs.length > 0) {
          content = paragraphs.join('\n\n');
          break;
        }
      }
    }

    if (!content) {
      const paragraphs = [];
      $('body p').each((i, p) => {
        const text = $(p).text().trim();
        if (text.length > 30 && !text.match(/^(?:Photo|Image|Credit|Source|By\s|©)/i)) {
          paragraphs.push(text);
        }
      });
      content = paragraphs.join('\n\n');
    }

    content = cleanArticleContent(content);
    
    if (content.length > 4000) {
      content = content.substring(0, 4000);
    }

    return content;
  } catch (error) {
    return null;
  }
}

async function fetchFromSource(source) {
  try {
    console.log(`  Fetching: ${source.name}...`);
    const feed = await parser.parseURL(source.url);
    const articles = [];

    const items = feed.items.slice(0, 5);
    for (const item of items) {
      const rssContent = cleanHtml(item.contentSnippet || item.content || item.description || '');
      let fullContent = await fetchFullContent(item.link);
      
      let content = fullContent || rssContent;
      if (content.length < 100 && rssContent.length > content.length) {
        content = rssContent;
      }

      const summary = content.substring(0, 600) + (content.length > 600 ? '...' : '');

      articles.push({
        id: uuidv4(),
        title: item.title || 'Untitled',
        link: item.link || '',
        summary: summary,
        content: content,
        image: extractFirstImage(item.content || ''),
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        category: source.category,
        icon: source.icon
      });
    }

    console.log(`  ✓ Got ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`  ✗ Failed to fetch ${source.name}: ${error.message}`);
    return [];
  }
}

async function fetchWithTimeout(promise, ms = 20000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

async function fetchAllArticles() {
  console.log('\n========================================');
  console.log('  考研英语外刊 - 文章抓取');
  console.log('  ' + new Date().toLocaleString('zh-CN'));
  console.log('========================================\n');

  const existing = loadArticles();
  let allArticles = existing.articles || [];

  const newArticles = [];
  const CONCURRENCY = 3;
  for (let i = 0; i < RSS_SOURCES.length; i += CONCURRENCY) {
    const batch = RSS_SOURCES.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(s => fetchWithTimeout(fetchFromSource(s), 20000))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newArticles.push(...result.value);
      }
    }
  }

  const existingLinks = new Set(allArticles.map(a => a.link));
  const uniqueNew = newArticles.filter(a => !existingLinks.has(a.link));

  allArticles = [...uniqueNew, ...allArticles];
  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  if (allArticles.length > 500) {
    allArticles = allArticles.slice(0, 500);
  }

  const data = {
    articles: allArticles,
    lastUpdate: new Date().toISOString(),
    totalSources: RSS_SOURCES.length,
    newCount: uniqueNew.length
  };

  saveArticles(data);

  console.log('\n========================================');
  console.log(`  抓取完成！`);
  console.log(`  新增文章: ${uniqueNew.length} 篇`);
  console.log(`  文章总数: ${allArticles.length} 篇`);
  console.log('========================================\n');

  return data;
}

if (require.main === module) {
  fetchAllArticles().catch(console.error);
}

module.exports = { fetchAllArticles, RSS_SOURCES };
