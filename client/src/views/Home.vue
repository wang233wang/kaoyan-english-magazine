<template>
  <div>
    <div class="stats-bar" v-if="stats">
      <div class="stat-item">
        <span>📰 文章总数</span>
        <span class="stat-value">{{ stats.totalArticles }}</span>
      </div>
      <div class="stat-item">
        <span>📝 生词收录</span>
        <span class="stat-value">{{ stats.totalWords }}</span>
      </div>
      <div class="stat-item">
        <span>🕐 最后更新</span>
        <span class="stat-value">{{ formatTime(stats.lastUpdate) }}</span>
      </div>
      <div style="margin-left:auto">
        <button class="btn btn-outline btn-sm" @click="manualFetch" :disabled="fetching">
          {{ fetching ? '⏳ 抓取中...' : '🔄 手动更新' }}
        </button>
      </div>
    </div>
    <div v-if="fetchMsg" class="fetch-status">{{ fetchMsg }}</div>

    <div class="filter-bar">
      <span class="filter-label">分类:</span>
      <div class="filter-chips">
        <span
          v-for="cat in categories"
          :key="cat"
          class="filter-chip"
          :class="{ active: currentCategory === cat }"
          @click="setCategory(cat)"
        >{{ cat }}</span>
      </div>
      <div class="search-box">
        <input
          v-model="searchKeyword"
          placeholder="搜索文章..."
          @keyup.enter="loadArticles"
        />
        <button class="btn btn-primary btn-sm" @click="loadArticles">搜索</button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载文章中...</p>
    </div>

    <div v-else-if="articles.length === 0" class="empty-state">
      <div class="icon">📭</div>
      <p>暂无文章，请点击"手动更新"获取最新外刊</p>
    </div>

    <div v-else class="article-grid">
      <div
        v-for="article in articles"
        :key="article.id"
        class="article-card"
        @click="openArticle(article)"
      >
        <div v-if="article.image" class="card-image" :style="{ backgroundImage: `url(${article.image})`, backgroundSize: 'cover' }"></div>
        <div v-else class="card-image-placeholder">{{ article.icon || '📄' }}</div>
        <div class="card-body">
          <div class="card-meta">
            <span class="card-category">{{ article.category }}</span>
            <span class="card-source">{{ article.source }}</span>
            <span class="card-date">{{ formatDate(article.pubDate) }}</span>
          </div>
          <h3 class="card-title">{{ article.title }}</h3>
          <p class="card-summary">{{ article.summary }}</p>
          <div class="card-actions">
            <button class="btn btn-outline btn-sm" @click.stop="openArticle(article)">📖 精读</button>
            <button class="btn btn-outline btn-sm" @click.stop="readAloud(article)">🔊 朗读</button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <button
        v-for="p in visiblePages"
        :key="p"
        :class="{ active: p === page }"
        @click="goPage(p)"
      >{{ p }}</button>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getArticles, getCategories, getStats, triggerFetch } from '../utils/api.js'
import { speakSentence } from '../utils/speech.js'

const router = useRouter()
const articles = ref([])
const categories = ref(['全部'])
const currentCategory = ref('全部')
const searchKeyword = ref('')
const page = ref(1)
const totalPages = ref(1)
const loading = ref(true)
const fetching = ref(false)
const fetchMsg = ref('')
const stats = ref(null)

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function loadArticles() {
  loading.value = true
  try {
    const res = await getArticles({
      category: currentCategory.value,
      page: page.value,
      limit: 18,
      search: searchKeyword.value
    })
    if (res.success) {
      articles.value = res.data.articles
      totalPages.value = res.data.totalPages
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function loadCategories() {
  try {
    const res = await getCategories()
    if (res.success) categories.value = res.data
  } catch (e) { /* ignore */ }
}

async function loadStats() {
  try {
    const res = await getStats()
    if (res.success) stats.value = res.data
  } catch (e) { /* ignore */ }
}

function setCategory(cat) {
  currentCategory.value = cat
  page.value = 1
  loadArticles()
}

function goPage(p) {
  page.value = p
  loadArticles()
}

function openArticle(article) {
  router.push(`/article/${article.id}`)
}

function readAloud(article) {
  const text = article.title + '. ' + article.summary
  speakSentence(text)
}

async function manualFetch() {
  fetching.value = true
  fetchMsg.value = '正在后台抓取最新文章...'
  try {
    const oldUpdate = stats.value?.lastUpdate
    await triggerFetch()
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000))
      await loadStats()
      if (stats.value?.lastUpdate && stats.value.lastUpdate !== oldUpdate) {
        const n = stats.value.lastNewCount
        if (n > 0) {
          fetchMsg.value = `✅ 新增 ${n} 篇文章！`
        } else {
          fetchMsg.value = '暂无新文章'
        }
        break
      }
      fetchMsg.value = `⏳ 抓取中 (${(i + 1) * 3}s)...`
    }
    await loadArticles()
  } catch (e) {
    fetchMsg.value = '❌ 更新失败: ' + e.message
  }
  fetching.value = false
  setTimeout(() => { fetchMsg.value = '' }, 4000)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatTime(dateStr) {
  if (!dateStr) return '暂无'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

onMounted(async () => {
  await Promise.all([loadArticles(), loadCategories(), loadStats()])
})
</script>
