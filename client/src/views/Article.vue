<template>
  <div class="article-detail">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载文章中...</p>
    </div>

    <div v-else-if="!article" class="empty-state">
      <div class="icon">❌</div>
      <p>文章未找到</p>
    </div>

    <template v-else>
      <div class="article-header">
        <div class="article-back" @click="$router.back()">← 返回列表</div>
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-info">
          <span class="article-info-item">{{ article.icon }} {{ article.source }}</span>
          <span class="article-info-item">📂 {{ article.category }}</span>
          <span class="article-info-item">🕐 {{ formatDate(article.pubDate) }}</span>
          <a v-if="article.link" :href="article.link" target="_blank" class="article-info-item">🔗 原文链接</a>
        </div>
      </div>

      <div class="article-toolbar">
        <button class="btn btn-primary" @click="toggleReading">
          {{ readState === 'playing' ? '⏸ 暂停' : readState === 'paused' ? '▶️ 继续' : '🔊 朗读全文' }}
        </button>
        <button class="btn btn-outline" @click="stopReading" :disabled="readState === 'stopped'">⏹ 停止</button>
        <button class="btn btn-outline btn-translate" :class="{ active: showTranslation }" @click="toggleTranslation" :disabled="translating">
          {{ translating ? '⏳ 翻译中...' : (showTranslation ? '🇨🇳 隐藏翻译' : '🌐 显示翻译') }}
        </button>
        <button class="btn btn-success" @click="exportPDF" :disabled="exporting">
          {{ exporting ? '⏳ 生成中...' : '📄 导出PDF' }}
        </button>
      </div>

      <div class="article-content">
        <div v-for="(para, i) in paragraphs" :key="i" class="para-block" :class="{ 'para-reading': currentParaIndex === i }">
          <p class="para-en">
            <template v-for="(segment, j) in splitParagraph(para)" :key="j">
              <span v-if="isWord(segment)" class="word" @click="handleWordClick($event, segment)">{{ segment }}</span>
              <span v-else>{{ segment }}</span>
            </template>
          </p>
          <p v-if="showTranslation && paraTranslations[i]" class="para-zh">
            {{ paraTranslations[i] }}
          </p>
        </div>
      </div>

      <div v-if="translating" class="translating-hint">
        <div class="spinner small"></div>
        <span>正在翻译中... ({{ translatedCount }}/{{ paragraphs.length }})</span>
      </div>

      <div v-if="wordPopup.show" class="word-tooltip" :style="wordPopup.style" @click="onTooltipClick">
        <div style="font-weight:600; margin-bottom:4px">{{ wordPopup.word }}</div>
        <div v-if="wordPopup.meaning" style="font-size:11px; opacity:0.9">{{ wordPopup.meaning }}</div>
        <div class="tooltip-actions">
          <button class="tooltip-btn" @click="pronounceWord(wordPopup.word)">🔊 发音</button>
          <button class="tooltip-btn" @click="addToVocab(wordPopup.word)">📝 收录</button>
          <button class="tooltip-btn" @click="translateWord(wordPopup.word)">🌐 翻译</button>
          <button class="tooltip-btn" @click="wordPopup.show = false">✕ 关闭</button>
        </div>
        <div v-if="wordPopup.translated" style="margin-top:6px; font-size:12px; color:#86efac">
          {{ wordPopup.translated }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getArticle, addVocabulary, translateText, translateParagraphs } from '../utils/api.js'
import { speakWord, stopSpeaking, getBestVoice } from '../utils/speech.js'


const route = useRoute()
const article = ref(null)
const loading = ref(true)
const paragraphs = ref([])
const showTranslation = ref(false)
const paraTranslations = ref({})
const translating = ref(false)
const translatedCount = ref(0)
const exporting = ref(false)
const readState = ref('stopped') // 'stopped' | 'playing' | 'paused'
const currentParaIndex = ref(-1)
let readingCancelled = false

const wordPopup = ref({
  show: false,
  word: '',
  meaning: '',
  translated: '',
  style: {}
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function splitParagraph(text) {
  if (!text) return []
  const regex = /([a-zA-Z']+|[^\w']+)/g
  const matches = text.match(regex) || []
  return matches
}

function isWord(segment) {
  return /^[a-zA-Z']+$/.test(segment)
}

function handleWordClick(event, word) {
  event.stopPropagation()
  const el = event.target
  el.classList.add('pronouncing')
  speakWord(word)
  setTimeout(() => el.classList.remove('pronouncing'), 800)

  const rect = el.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const tooltipWidth = 220

  let left = rect.left + rect.width / 2 - tooltipWidth / 2
  if (left < 10) left = 10
  if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10

  wordPopup.value = {
    show: true,
    word,
    meaning: '',
    translated: '',
    style: {
      left: left + 'px',
      top: (rect.top - 8) + 'px',
      transform: 'translateY(-100%)'
    }
  }
}

function pronounceWord(word) {
  speakWord(word)
}

async function translateWord(word) {
  try {
    const res = await translateText(word)
    if (res.success) {
      wordPopup.value.translated = res.data.translatedText
    }
  } catch (e) {
    wordPopup.value.translated = '翻译失败'
  }
}

async function addToVocab(word) {
  try {
    await addVocabulary(word, wordPopup.value.translated || '', article.value.title, article.value.id)
    wordPopup.value.show = false
    alert(`已收录"${word}"到生词本`)
  } catch (e) {
    alert('收录失败')
  }
}

function readFullAloud() {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  readingCancelled = false
  readPara(0)
}

function readPara(i) {
  if (readingCancelled) return
  const paras = paragraphs.value
  if (i >= paras.length) {
    readState.value = 'stopped'
    currentParaIndex.value = -1
    return
  }
  const text = paras[i]
  if (!text || text.trim().length < 5) {
    readPara(i + 1)
    return
  }
  currentParaIndex.value = i
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.85
  u.pitch = 1
  const voice = getBestVoice()
  if (voice) u.voice = voice
  u.onend = () => { if (!readingCancelled) readPara(i + 1) }
  u.onerror = () => { if (!readingCancelled) readPara(i + 1) }
  window.speechSynthesis.speak(u)
}

function toggleReading() {
  if (readState.value === 'playing') {
    window.speechSynthesis.pause()
    readState.value = 'paused'
  } else if (readState.value === 'paused') {
    window.speechSynthesis.resume()
    readState.value = 'playing'
  } else {
    readFullAloud()
    readState.value = 'playing'
  }
}

function stopReading() {
  readingCancelled = true
  stopSpeaking()
  readState.value = 'stopped'
  currentParaIndex.value = -1
}

async function toggleTranslation() {
  showTranslation.value = !showTranslation.value
  if (showTranslation.value && Object.keys(paraTranslations.value).length === 0) {
    await translateAllParagraphs()
  }
}

async function translateAllParagraphs() {
  translating.value = true
  translatedCount.value = 0
  paraTranslations.value = {}

  try {
    for (let i = 0; i < paragraphs.value.length; i++) {
      const para = paragraphs.value[i]
      if (para.trim().length < 10) {
        paraTranslations.value[i] = ''
        translatedCount.value++
        continue
      }
      try {
        const res = await translateText(para)
        if (res.success) {
          paraTranslations.value[i] = res.data.translatedText
        } else {
          paraTranslations.value[i] = '[翻译失败]'
        }
      } catch (e) {
        paraTranslations.value[i] = '[翻译失败]'
      }
      translatedCount.value++
    }
  } catch (e) {
    console.error(e)
  }
  translating.value = false
}

async function exportPDF() {
  if (exporting.value) return
  exporting.value = true
  try {
    const a = document.createElement('a')
    a.href = `/api/articles/${article.value.id}/pdf`
    a.download = `${(article.value.title || 'article').substring(0, 50)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => { exporting.value = false }, 2000)
  } catch (e) {
    alert('导出失败: ' + (e.message || '未知错误'))
    exporting.value = false
  }
}

function handleClickOutside(e) {
  if (wordPopup.value.show && !e.target.closest('.word-tooltip') && !e.target.closest('.word')) {
    wordPopup.value.show = false
  }
}

function onTooltipClick(e) {
  e.stopPropagation()
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  
  try {
    const res = await getArticle(route.params.id)
    if (res.success) {
      article.value = res.data
      const content = res.data.content || res.data.summary || ''
      
      let paras = content.split(/\n+/).filter(p => p.trim().length > 20)
      
      if (paras.length <= 1 && content.length > 300) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content]
        paras = []
        let current = ''
        for (const sent of sentences) {
          if (current.length + sent.length > 280) {
            if (current) paras.push(current.trim())
            current = sent
          } else {
            current += ' ' + sent
          }
        }
        if (current.trim()) paras.push(current.trim())
      }
      
      if (paras.length === 0) {
        paras = [content]
      }
      
      paragraphs.value = paras
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  stopSpeaking()
})

watch(currentParaIndex, (i) => {
  if (i < 0) return
  nextTick(() => {
    const el = document.querySelector('.para-reading')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})
</script>

<style scoped>
.para-block {
  margin-bottom: 20px;
}

.para-en {
  font-family: var(--font-serif);
  font-size: 17px;
  line-height: 1.9;
  color: var(--text);
  text-align: justify;
}

.para-zh {
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.8;
  color: #374151;
  padding: 12px 16px;
  margin-top: 8px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 3px solid #0ea5e9;
  border-radius: 0 8px 8px 0;
}

.btn-success {
  background: #34a853;
  color: white;
  border-color: #34a853;
}
.btn-success:hover {
  background: #2d8f47;
}
.btn-success:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-translate.active {
  background: #0ea5e9;
  color: white;
  border-color: #0ea5e9;
}

.translating-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  margin-top: 20px;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
  font-size: 14px;
}

.spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
  margin-bottom: 0;
}

.para-reading {
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  border-left: 3px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  padding: 8px 16px;
  margin: 0 -16px 20px -16px;
  transition: background 0.3s ease;
}

.para-reading .para-zh {
  background: transparent;
  border-left: none;
  padding: 12px 0;
}
</style>
