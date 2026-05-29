const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const bing = require('bing-translate-api');
const { fetchAllArticles, RSS_SOURCES } = require('./scripts/fetchArticles');

process.on('uncaughtException', (err) => console.error('[未捕获异常]', err.message));
process.on('unhandledRejection', (err) => console.error('[未处理拒绝]', err?.message || err));

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const VOCAB_FILE = path.join(DATA_DIR, 'vocabulary.json');

app.use(cors());
app.use(express.json());

const DIST_DIR = path.join(__dirname, '../client/dist');

function loadJson(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {}
  return defaultValue;
}

function saveJson(filePath, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function translateText(text, from = 'en', to = 'zh-Hans') {
  if (!text || text.trim().length === 0) return '';
  try {
    const result = await bing.translate(text.substring(0, 500), from, to);
    return result.translation;
  } catch (e) {
    console.error('[翻译错误]', e.message);
    return '[翻译不可用]';
  }
}

// Init
(async () => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  if (data.articles.length === 0) {
    console.log('[INIT] 抓取文章...');
    await fetchAllArticles();
  }
})();

cron.schedule('0 6 * * *', () => fetchAllArticles().catch(console.error));

// API Routes
app.get('/api/articles', (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [], lastUpdate: null });
  let articles = data.articles || [];
  const { category, source, page = 1, limit = 20, search } = req.query;
  if (category && category !== '全部') articles = articles.filter(a => a.category === category);
  if (source) articles = articles.filter(a => a.source === source);
  if (search) {
    const kw = search.toLowerCase();
    articles = articles.filter(a => a.title.toLowerCase().includes(kw) || a.summary.toLowerCase().includes(kw));
  }
  const total = articles.length;
  const start = (parseInt(page) - 1) * parseInt(limit);
  res.json({ success: true, data: { articles: articles.slice(start, start + parseInt(limit)), total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)), lastUpdate: data.lastUpdate }});
});

app.get('/api/articles/:id', (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  const article = data.articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: article });
});

app.get('/api/articles/:id/export', async (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  const article = data.articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ success: false, message: 'Not found' });

  let paragraphs = (article.content || article.summary || '').split(/\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length <= 1 && (article.content || '').length > 300) {
    const sentences = article.content.match(/[^.!?]+[.!?]+/g) || [article.content];
    paragraphs = [];
    let current = '';
    for (const sent of sentences) {
      if (current.length + sent.length > 280) {
        if (current) paragraphs.push(current.trim());
        current = sent;
      } else {
        current += ' ' + sent;
      }
    }
    if (current.trim()) paragraphs.push(current.trim());
  }
  if (paragraphs.length === 0) paragraphs = [article.content || article.summary || ''];

  const translations = [];
  for (const para of paragraphs) {
    if (para.trim().length < 10) { translations.push(''); continue }
    try {
      const result = await bing.translate(para.substring(0, 500), 'en', 'zh-Hans');
      translations.push(result.translation);
    } catch (e) {
      translations.push('[翻译不可用]');
    }
  }

  const allWords = (article.content || '').match(/[a-zA-Z]{7,}/g) || [];
  const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))].slice(0, 30);

  res.json({ success: true, data: { title: article.title, source: article.source, category: article.category, icon: article.icon, pubDate: article.pubDate, link: article.link, paragraphs, translations, vocabulary: uniqueWords } });
});

app.get('/api/articles/:id/pdf-view', async (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  const article = data.articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).send('文章未找到');

  let paragraphs = (article.content || article.summary || '').split(/\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length <= 1 && (article.content || '').length > 300) {
    const sentences = article.content.match(/[^.!?]+[.!?]+/g) || [article.content];
    paragraphs = []; let current = '';
    for (const s of sentences) {
      if (current.length + s.length > 280) { if (current) paragraphs.push(current.trim()); current = s }
      else { current += ' ' + s }
    }
    if (current.trim()) paragraphs.push(current.trim());
  }
  if (paragraphs.length === 0) paragraphs = [article.content || article.summary || ''];

  const translations = [];
  for (const para of paragraphs) {
    if (para.trim().length < 10) { translations.push(''); continue }
    try {
      const result = await bing.translate(para.substring(0, 500), 'en', 'zh-Hans');
      translations.push(result.translation);
    } catch (e) { translations.push(''); }
  }

  const allWords = (article.content || '').match(/[a-zA-Z]{7,}/g) || [];
  const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))].slice(0, 30);
  const pubDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  let parasHtml = '';
  for (let i = 0; i < paragraphs.length; i++) {
    const en = escapeHtml(paragraphs[i]);
    const zh = translations[i] ? escapeHtml(translations[i]) : '';
    parasHtml += `<div class="para"><p class="en">${en}</p>${zh ? `<p class="zh">${zh}</p>` : ''}</div>`;
  }

  let vocabHtml = '';
  if (uniqueWords.length > 0) {
    const rows = uniqueWords.map(w => `<tr><td class="word-cell">${w}</td><td class="def-cell"></td></tr>`).join('');
    vocabHtml = `<div class="vocab-section"><h2>📖 重点词汇</h2><table><thead><tr><th>单词</th><th>释义</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escapeHtml(article.title)}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#1a1a1a;line-height:1.8;padding:40px 50px;max-width:900px;margin:0 auto}
.header{text-align:center;margin-bottom:36px;padding-bottom:24px;border-bottom:3px double #1a73e8}
.header h1{font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.4;margin-bottom:12px;color:#000}
.header .meta{font-size:13px;color:#888}
.header .meta span{margin:0 8px}
.header .meta .sep{color:#ccc}
.content .para{margin-bottom:22px;page-break-inside:avoid}
.content .en{font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.9;text-align:justify;color:#1a1a1a}
.content .zh{font-size:13px;line-height:1.8;color:#555;background:#f5f7fa;padding:10px 14px;border-left:3px solid #1a73e8;border-radius:0 4px 4px 0;margin-top:6px}
.vocab-section{margin-top:40px;padding-top:24px;border-top:2px solid #e0e0e0;page-break-before:always}
.vocab-section h2{font-size:18px;color:#1a73e8;margin-bottom:14px}
.vocab-section table{width:100%;border-collapse:collapse;font-size:13px}
.vocab-section th{background:#e8f0fe;padding:8px 12px;border:1px solid #d0d7de;text-align:left;font-weight:600}
.vocab-section td{padding:7px 12px;border:1px solid #d0d7de}
.vocab-section .word-cell{font-weight:600;color:#1a73e8;width:40%}
.vocab-section .def-cell{width:60%}
.footer{text-align:center;margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:11px;color:#aaa}
@media print{body{padding:20px 30px}.header h1{font-size:22px}.content .en{font-size:13px}.content .zh{font-size:12px}}
</style></head><body>
<div class="header"><h1>${escapeHtml(article.title)}</h1><div class="meta"><span>${article.icon||''} ${escapeHtml(article.source||'')}</span><span class="sep">|</span><span>${escapeHtml(article.category||'')}</span><span class="sep">|</span><span>${pubDate}</span></div></div>
<div class="content">${parasHtml}</div>${vocabHtml}
<div class="footer">由 考研英语外刊精读 生成 · ${new Date().toLocaleDateString('zh-CN')}</div>
<script>window.onload=function(){window.print()}<\/script></body></html>`;

  res.setHeader('Content-Type', 'text/html;charset=utf-8');
  res.send(html);
});

app.get('/api/articles/:id/pdf', async (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  const article = data.articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ success: false, message: 'Not found' });

  let paragraphs = (article.content || article.summary || '').split(/\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length <= 1 && (article.content || '').length > 300) {
    const sentences = article.content.match(/[^.!?]+[.!?]+/g) || [article.content];
    paragraphs = []; let current = '';
    for (const s of sentences) {
      if (current.length + s.length > 280) { if (current) paragraphs.push(current.trim()); current = s }
      else { current += ' ' + s }
    }
    if (current.trim()) paragraphs.push(current.trim());
  }
  if (paragraphs.length === 0) paragraphs = [article.content || article.summary || ''];

  const translations = [];
  for (const para of paragraphs) {
    if (para.trim().length < 10) { translations.push(''); continue }
    try {
      const result = await bing.translate(para.substring(0, 500), 'en', 'zh-Hans');
      translations.push(result.translation);
    } catch (e) { translations.push(''); }
  }

  const allWords = (article.content || '').match(/[a-zA-Z]{7,}/g) || [];
  const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))].slice(0, 30);
  const pubDate = article.pubDate ? new Date(article.pubDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  let parasHtml = '';
  for (let i = 0; i < paragraphs.length; i++) {
    const en = escapeHtml(paragraphs[i]);
    const zh = translations[i] ? escapeHtml(translations[i]) : '';
    parasHtml += `<div class="para"><p class="en">${en}</p>${zh ? `<p class="zh">${zh}</p>` : ''}</div>`;
  }

  let vocabHtml = '';
  if (uniqueWords.length > 0) {
    const rows = uniqueWords.map(w => `<tr><td class="word-cell">${w}</td><td class="def-cell"></td></tr>`).join('');
    vocabHtml = `<div class="vocab-section"><h2>重点词汇</h2><table><thead><tr><th>单词</th><th>释义</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',Georgia,'PingFang SC','Microsoft YaHei',serif;color:#1a1a1a;line-height:1.8;padding:60px 70px}
.header{text-align:center;margin-bottom:30px;padding-bottom:18px;border-bottom:2px solid #1a73e8}
.header h1{font-size:24px;line-height:1.4;margin-bottom:10px}
.header .meta{font-size:12px;color:#888}
.content .para{margin-bottom:18px}
.content .en{font-size:13px;line-height:1.9;text-align:justify}
.content .zh{font-size:12px;line-height:1.7;color:#444;background:#f5f7fa;padding:8px 12px;border-left:3px solid #1a73e8;margin-top:5px}
.vocab-section{margin-top:40px;padding-top:20px;border-top:2px solid #e0e0e0}
.vocab-section h2{font-size:16px;color:#1a73e8;margin-bottom:12px}
.vocab-section table{width:100%;border-collapse:collapse;font-size:12px}
.vocab-section th{background:#e8f0fe;padding:6px 10px;border:1px solid #d0d7de;text-align:left}
.vocab-section td{padding:5px 10px;border:1px solid #d0d7de}
.vocab-section .word-cell{font-weight:600;color:#1a73e8;width:35%}
.footer{text-align:center;margin-top:30px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:10px;color:#aaa}
</style></head><body>
<div class="header"><h1>${escapeHtml(article.title)}</h1><div class="meta"><span>${escapeHtml(article.source||'')} | ${escapeHtml(article.category||'')} | ${pubDate}</span></div></div>
<div class="content">${parasHtml}</div>${vocabHtml}
<div class="footer">考研英语外刊精读 · ${new Date().toLocaleDateString('zh-CN')}</div></body></html>`;

  try {
    const puppeteer = require('puppeteer');
    let launchOpts = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === 'win32') {
      const paths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      ];
      for (const p of paths) { if (require('fs').existsSync(p)) { launchOpts.executablePath = p; break } }
    }
    const browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
      displayHeaderFooter: false
    });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent((article.title || 'article').trim().substring(0, 50))}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (e) {
    console.error('[PDF ERROR]', e.message);
    res.status(500).json({ success: false, message: 'PDF 生成失败: ' + e.message });
  }
});

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

app.get('/api/categories', (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  res.json({ success: true, data: ['全部', ...new Set(data.articles.map(a => a.category))] });
});

let fetchingInProgress = false;
let lastFetchNewCount = 0;

app.post('/api/fetch', async (req, res) => {
  if (fetchingInProgress) {
    return res.json({ success: true, message: '抓取中，请稍候...' });
  }
  fetchingInProgress = true;
  res.json({ success: true, message: '开始抓取...' });

  try {
    const result = await fetchAllArticles();
    lastFetchNewCount = result.newCount || 0;
  } catch (e) {
    console.error('[FETCH ERROR]', e.message);
  }
  fetchingInProgress = false;
});

app.get('/api/translate', async (req, res) => {
  const { text, from = 'en', to = 'zh-CN' } = req.query;
  if (!text) return res.status(400).json({ success: false, message: 'Text required' });
  const translatedText = await translateText(text, from, 'zh-Hans');
  res.json({ success: true, data: { translatedText } });
});

app.post('/api/translate/paragraphs', async (req, res) => {
  const { paragraphs, from = 'en', to = 'zh-Hans' } = req.body;
  if (!paragraphs || !Array.isArray(paragraphs)) return res.status(400).json({ success: false });
  const results = [];
  for (const para of paragraphs) {
    const zh = para.trim().length < 5 ? '' : await translateText(para, from, to);
    results.push({ en: para, zh });
  }
  res.json({ success: true, data: results });
});

app.get('/api/vocabulary', (req, res) => {
  res.json({ success: true, data: loadJson(VOCAB_FILE, { words: [] }).words });
});

app.post('/api/vocabulary', (req, res) => {
  const { word, meaning, sentence, articleId } = req.body;
  const vocab = loadJson(VOCAB_FILE, { words: [] });
  if (!vocab.words.find(w => w.word === word)) {
    vocab.words.unshift({ id: Date.now().toString(), word, meaning: meaning || '', sentence: sentence || '', articleId: articleId || '', createdAt: new Date().toISOString() });
    saveJson(VOCAB_FILE, vocab);
  }
  res.json({ success: true, data: vocab.words });
});

app.delete('/api/vocabulary/:id', (req, res) => {
  const vocab = loadJson(VOCAB_FILE, { words: [] });
  vocab.words = vocab.words.filter(w => w.id !== req.params.id);
  saveJson(VOCAB_FILE, vocab);
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const data = loadJson(ARTICLES_FILE, { articles: [] });
  const vocab = loadJson(VOCAB_FILE, { words: [] });
  res.json({ success: true, data: { totalArticles: data.articles?.length || 0, totalWords: vocab.words?.length || 0, lastUpdate: data.lastUpdate, lastNewCount: lastFetchNewCount }});
});

app.use(express.static(DIST_DIR));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { ip = net.address; break; }
    }
    if (ip !== 'localhost') break;
  }
  console.log(`\n========================================`);
  console.log(`  考研英语外刊服务器已启动`);
  console.log(`  本机:    http://localhost:${PORT}`);
  console.log(`  手机:    http://${ip}:${PORT}`);
  console.log(`========================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n端口 ${PORT} 已被占用，可能服务器已启动。`);
  } else {
    console.error('服务器启动失败:', err.message);
  }
});
