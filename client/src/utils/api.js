import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
})

export async function getArticles(params = {}) {
  const { data } = await api.get('/articles', { params })
  return data
}

export async function getArticle(id) {
  const { data } = await api.get(`/articles/${id}`)
  return data
}

export async function getCategories() {
  const { data } = await api.get('/categories')
  return data
}

export async function getSources() {
  const { data } = await api.get('/sources')
  return data
}

export async function triggerFetch() {
  const { data } = await api.post('/fetch', null, { timeout: 300000 })
  return data
}

export async function translateText(text, from = 'en', to = 'zh-CN') {
  const { data } = await api.get('/translate', { params: { text, from, to } })
  return data
}

export async function translateParagraphs(paragraphs, from = 'en', to = 'zh-CN') {
  const { data } = await api.post('/translate/paragraphs', { paragraphs, from, to })
  return data
}

export async function batchTranslate(texts, from = 'en', to = 'zh-CN') {
  const { data } = await api.post('/translate/batch', { texts, from, to })
  return data
}

export async function getVocabulary() {
  const { data } = await api.get('/vocabulary')
  return data
}

export async function addVocabulary(word, meaning = '', sentence = '', articleId = '') {
  const { data } = await api.post('/vocabulary', { word, meaning, sentence, articleId })
  return data
}

export async function removeVocabulary(id) {
  const { data } = await api.delete(`/vocabulary/${id}`)
  return data
}

export async function getArticleExport(id) {
  const { data } = await api.get(`/articles/${id}/export`, { timeout: 300000 })
  return data
}

export async function getStats() {
  const { data } = await api.get('/stats')
  return data
}
