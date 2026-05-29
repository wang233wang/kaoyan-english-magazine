<template>
  <div>
    <div class="vocab-header">
      <h2>📝 我的生词本</h2>
      <span style="color:var(--text-secondary); font-size:14px">共收录 {{ words.length }} 个单词</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="words.length === 0" class="empty-state">
      <div class="icon">📖</div>
      <p>暂无生词，阅读文章时点击单词即可收录</p>
    </div>

    <div v-else class="vocab-list">
      <div v-for="word in words" :key="word.id" class="vocab-item">
        <span class="vocab-word" @click="pronounce(word.word)">{{ word.word }}</span>
        <span class="vocab-meaning">{{ word.meaning || '—' }}</span>
        <span class="vocab-sentence">{{ word.sentence || '—' }}</span>
        <button class="btn btn-outline btn-sm" @click="pronounce(word.word)">🔊</button>
        <button class="vocab-delete" @click="deleteWord(word.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getVocabulary, removeVocabulary } from '../utils/api.js'
import { speakWord } from '../utils/speech.js'

const words = ref([])
const loading = ref(true)

async function loadWords() {
  loading.value = true
  try {
    const res = await getVocabulary()
    if (res.success) words.value = res.data
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

function pronounce(word) {
  speakWord(word)
}

async function deleteWord(id) {
  if (!confirm('确定删除此生词？')) return
  try {
    await removeVocabulary(id)
    words.value = words.value.filter(w => w.id !== id)
  } catch (e) {
    alert('删除失败')
  }
}

onMounted(loadWords)
</script>
