<template>
  <div id="app">
    <header class="app-header">
      <div class="header-inner">
        <div class="logo" @click="$router.push('/')">
          <span class="logo-icon">📚</span>
          <span>考研英语外刊精读</span>
        </div>
        <nav>
          <ul class="nav-links">
            <li><router-link to="/">首页</router-link></li>
            <li><router-link to="/vocabulary">生词本</router-link></li>
          </ul>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="app-footer">
      <p>考研英语外刊精读 - 基于 awesome-english-ebooks 开源项目 | 每日自动更新</p>
      <p style="margin-top:4px">外刊来源: The Guardian, BBC, NPR, The Atlantic, Scientific American 等</p>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices()
  }
})
</script>
