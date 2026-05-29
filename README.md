# 考研英语外刊精读

基于 [awesome-english-ebooks](https://github.com/hehonghui/awesome-english-ebooks) 开源项目的考研英语外刊学习网站。

## 功能特性

- **每日自动更新** - 服务器每天早上6:00自动抓取最新外刊文章
- **中英互译** - 支持全文翻译和单词即时翻译
- **单词发音** - 点击任意英语单词即可听到标准发音
- **生词本** - 收录生词，方便复习
- **多源聚合** - 整合 NPR、MIT Tech Review、BBC、The Guardian 等多个外刊源
- **分类筛选** - 按新闻、科技、科学等分类浏览
- **关键词搜索** - 快速找到感兴趣的文章

## 技术栈

- **前端**: Vue 3 + Vite + Vue Router + Pinia
- **后端**: Node.js + Express
- **RSS解析**: rss-parser
- **定时任务**: node-cron
- **翻译API**: MyMemory (免费)
- **发音**: Web Speech API

## 快速开始

### 1. 安装依赖

```bash
cd kaoyan-english-magazine
npm run install:all
```

### 2. 首次抓取文章

```bash
npm run fetch
```

### 3. 启动项目

**Windows:**
双击 `start.bat`

**手动启动:**
```bash
# 终端1 - 启动后端
npm run server

# 终端2 - 启动前端
npm run client
```

### 4. 访问网站

打开浏览器访问: http://localhost:5173

## 项目结构

```
kaoyan-english-magazine/
├── server/                    # 后端服务
│   ├── index.js              # Express 服务器
│   ├── scripts/
│   │   └── fetchArticles.js  # RSS 抓取脚本
│   ├── data/
│   │   ├── articles.json     # 文章数据
│   │   └── vocabulary.json   # 生词本数据
│   └── package.json
├── client/                    # 前端应用
│   ├── src/
│   │   ├── views/
│   │   │   ├── Home.vue      # 首页(文章列表)
│   │   │   ├── Article.vue   # 文章详情(阅读)
│   │   │   └── Vocabulary.vue # 生词本
│   │   ├── utils/
│   │   │   ├── api.js        # API 请求封装
│   │   │   └── speech.js     # 发音功能封装
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── router/
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── start.bat                  # 一键启动脚本
├── fetch.bat                  # 手动抓取脚本
├── package.json
└── README.md
```

## 使用说明

### 阅读文章
1. 在首页浏览文章列表，支持按分类筛选和搜索
2. 点击文章卡片进入阅读模式
3. 阅读时点击任意英语单词即可听到发音
4. 点击"显示翻译"按钮查看全文中文翻译

### 收录生词
1. 在阅读模式下点击单词
2. 在弹出的工具栏中点击"收录"按钮
3. 单词会被保存到生词本

### 手动更新
- 点击首页的"手动更新"按钮
- 或运行 `npm run fetch`

## 外刊来源

| 来源 | 分类 | 更新频率 |
|------|------|----------|
| MIT Tech Review | 科技 | 每日 |
| NPR - World | 新闻 | 每日 |
| NPR - Science | 科学 | 每日 |
| NPR - Technology | 科技 | 每日 |
| BBC - World | 新闻 | 每日 |
| The Guardian | 新闻/科学 | 每日 |

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/articles | GET | 获取文章列表 |
| /api/articles/:id | GET | 获取文章详情 |
| /api/categories | GET | 获取分类列表 |
| /api/translate | GET | 翻译文本 |
| /api/vocabulary | GET/POST | 生词本管理 |
| /api/stats | GET | 统计信息 |
| /api/fetch | POST | 手动触发抓取 |

## License

MIT
