<template>
  <div class="home">
    <div class="home-top">
      <h2 class="home-greeting">我的图鉴</h2>
      <button class="btn btn-primary" @click="showCreate = true">+ 新建</button>
    </div>

    <div v-if="store.loaded && store.collections.length === 0" class="empty-state">
      <p>还没有图鉴</p>
      <p style="margin-top:4px">点击右上角新建一个</p>
    </div>

    <div class="list">
      <div v-for="c in store.collections" :key="c.id" class="list-item card"
        @click="$router.push(`/collection/${c.id}`)">
        <div class="list-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="list-body">
          <div class="list-title">{{ c.name }}</div>
          <div class="list-sub">{{ c.images.length }} 张图 · {{ totalCards(c) }} 张小卡</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="list-arrow">
          <path d="M9 6L15 12L9 18" stroke="#C4C4C4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>新建图鉴</h3>
        <input class="input" v-model="newName" placeholder="输入图鉴名称" @keyup.enter="create" autofocus />
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="create" :disabled="!newName.trim()">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore.js'

const store = useAppStore()
onMounted(() => { if (!store.loaded) store.load() })

const showCreate = ref(false)
const newName = ref('')

function totalCards(c) {
  return c.images.reduce((s, img) => s + (img.cells ? img.cells.length : 0), 0)
}

async function create() {
  if (!newName.value.trim()) return
  await store.createCollection(newName.value.trim())
  newName.value = ''
  showCreate.value = false
}
</script>

<style scoped>
.home { padding-top: 4px; }
.home-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.home-greeting { font-size: 22px; font-weight: 700; }
.list { display: flex; flex-direction: column; gap: 10px; }
.list-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; cursor: pointer; }
.list-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--primary-bg); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.list-body { flex: 1; min-width: 0; }
.list-title { font-size: 16px; font-weight: 500; }
.list-sub { font-size: 13px; color: var(--text2); margin-top: 2px; }
.list-arrow { flex-shrink: 0; }
</style>
