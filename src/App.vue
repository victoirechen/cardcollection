<template>
  <div class="app">
    <header class="header">
      <button class="header-back" v-if="showBack" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <h1 class="header-title">{{ title }}</h1>
      <div class="header-right" v-if="showBack"></div>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from './stores/appStore.js'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

onMounted(() => { if (!store.loaded) store.load(); if (!store.albumsLoaded) store.loadAlbumsData() })

const titles = { welcome: '卡牌收集', home: '小卡收集', collection: '', 'image-edit': '', unowned: '未拥有卡片', albums: '我的图鉴', album: '' }
const title = computed(() => titles[route.name] || '')
const showBack = computed(() => route.name !== 'welcome')

function goBack() { router.back() }
</script>

<style>
:root {
  --primary: #6C5CE7;
  --primary-light: #A29BFE;
  --primary-bg: rgba(108,92,231,0.08);
  --bg: #F5F6FA;
  --surface: #FFFFFF;
  --text: #2D3436;
  --text2: #7B7F8E;
  --border: #EDEDF0;
  --radius: 14px;
  --radius-sm: 10px;
  --shadow: 0 2px 16px rgba(0,0,0,0.05);
  --header-h: 52px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
.app { max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; }
.header {
  position: sticky; top: 0; z-index: 20;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  display: flex; align-items: center;
  height: var(--header-h); padding: 0 16px;
  border-bottom: 0.5px solid var(--border);
}
.header-title { flex: 1; font-size: 17px; font-weight: 600; text-align: center; }
.header-back, .header-right { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.header-back { background: none; border: none; color: var(--primary); cursor: pointer; border-radius: 10px; margin-left: -8px; }
.header-back:active { background: var(--primary-bg); }
.main { flex: 1; padding: 12px 16px; padding-bottom: 32px; }

.card {
  background: var(--surface); border-radius: var(--radius);
  box-shadow: var(--shadow); transition: transform 0.12s;
}
.card:active { transform: scale(0.97); }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 0 20px; height: 44px; border: none; border-radius: var(--radius-sm);
  font-size: 15px; font-weight: 500; cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  -webkit-user-select: none; user-select: none;
}
.btn:active { opacity: 0.7; transform: scale(0.97); }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:active { background: #5A4BD1; }
.btn-outline { background: transparent; border: 1.5px solid var(--primary); color: var(--primary); }
.btn-danger { background: #FF6B6B; color: #fff; }
.btn-ghost { background: transparent; color: var(--text2); height: 36px; padding: 0 12px; }
.btn-block { width: 100%; }
.btn-sm { height: 36px; font-size: 13px; padding: 0 14px; }

.input, .input-number {
  padding: 12px 14px; border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  font-size: 15px; width: 100%; outline: none; background: var(--surface);
  transition: border-color 0.15s;
}
.input:focus, .input-number:focus { border-color: var(--primary); }
.input-number { width: 64px; text-align: center; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text2); font-size: 15px; line-height: 1.6; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 20px;
}
.modal {
  background: var(--surface); border-radius: var(--radius);
  padding: 24px; width: 100%; max-width: 320px;
  display: flex; flex-direction: column; gap: 16px;
}
.modal h3 { font-size: 18px; font-weight: 600; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

.pulse { animation: pulse 0.3s; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
</style>
