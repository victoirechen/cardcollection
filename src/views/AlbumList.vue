<template>
  <div class="albums">
    <div v-if="store.albumsLoaded && store.albums.length === 0" class="empty-state">
      <p>还没有图鉴</p>
      <button class="btn btn-primary" style="margin-top:12px" @click="showCreate = true">+ 创建图鉴</button>
    </div>

    <div class="list">
      <div v-for="a in store.albums" :key="a.id" class="list-item card"
        @click="$router.push(`/album/${a.id}`)">
        <div class="list-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M8 8H16V12H8V8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M8 14H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="list-body">
          <div class="list-title">{{ a.name }}</div>
          <div class="list-sub">{{ a.images.length }} 张图</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="list-arrow">
          <path d="M9 6L15 12L9 18" stroke="#C4C4C4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <button class="fab" @click="showCreate = true">+</button>

    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h3>创建图鉴</h3>
        <input class="input" v-model="newName" placeholder="图鉴标题" @keyup.enter="create" autofocus />
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="create" :disabled="!newName.trim()">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore.js'

const store = useAppStore()
const router = useRouter()

const showCreate = ref(false)
const newName = ref('')

async function create() {
  if (!newName.value.trim()) return
  const a = await store.createAlbum(newName.value.trim())
  newName.value = ''
  showCreate.value = false
  router.push(`/album/${a.id}`)
}
</script>

<style scoped>
.albums{padding-top:4px}
.list{display:flex;flex-direction:column;gap:10px}
.list-item{display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer}
.list-icon{width:40px;height:40px;border-radius:10px;background:var(--primary-bg);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.list-body{flex:1;min-width:0}
.list-title{font-size:16px;font-weight:500}
.list-sub{font-size:13px;color:var(--text2);margin-top:2px}
.list-arrow{flex-shrink:0}
.fab{position:fixed;bottom:24px;right:24px;width:52px;height:52px;border:none;border-radius:50%;background:var(--primary);color:#fff;font-size:28px;cursor:pointer;box-shadow:0 4px 16px rgba(108,92,231,.35);z-index:50;display:flex;align-items:center;justify-content:center}
.fab:active{opacity:.8}
</style>
