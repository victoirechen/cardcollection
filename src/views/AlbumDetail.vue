<template>
  <div class="album" v-if="album">
    <div class="album-top">
      <input class="album-title-input" v-model="editName" @blur="saveName" placeholder="图鉴标题" />
    </div>

    <div class="album-actions">
      <label class="btn btn-sm btn-primary upload-btn">
        + 添加图片
        <input type="file" accept="image/*" multiple @change="addImages" hidden />
      </label>
      <div class="export-cols">
        <span class="ec-label">每行</span>
        <div class="stepper">
          <button class="step-btn" @click="exportCols = Math.max(1, exportCols - 1)">−</button>
          <span class="step-val">{{ exportCols }}</span>
          <button class="step-btn" @click="exportCols = Math.min(6, exportCols + 1)">+</button>
        </div>
      </div>
      <button class="btn btn-sm btn-outline" @click="exportAlbum">📷 导出</button>
    </div>

    <div v-if="album.images.length === 0" class="empty-state" style="padding:40px 20px">
      <p>还没有图片，点击上方添加</p>
    </div>

    <div class="image-list">
      <div v-for="(img, idx) in album.images" :key="img.id" class="image-card card">
        <img :src="imgUrl(img)" class="album-img" />
        <div class="img-footnote">
          <input class="footnote-input" v-model="img.footnote" @blur="e => saveFootnote(img.id, e.target.value)" placeholder="添加脚注..." />
        </div>
        <button class="img-del" @click="removeImage(img.id)">✕</button>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">加载中...</div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore.js'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const album = computed(() => store.getAlbum(route.params.id))
const editName = ref('')
const exportCols = ref(2)
watch(album, a => { if (a) editName.value = a.name }, { immediate: true })

const imgUrls = {}
function imgUrl(img) {
  if (!imgUrls[img.id]) imgUrls[img.id] = URL.createObjectURL(img.data)
  return imgUrls[img.id]
}

onBeforeUnmount(() => { for (const id in imgUrls) URL.revokeObjectURL(imgUrls[id]) })

async function saveName() {
  if (album.value && editName.value.trim()) await store.updateAlbumName(album.value.id, editName.value.trim())
}

async function addImages(e) {
  const files = Array.from(e.target.files)
  if (!files.length) return
  for (const f of files) await store.addAlbumImage(album.value.id, f, '')
  e.target.value = ''
}

async function removeImage(id) {
  if (confirm('删除这张图片？')) await store.removeAlbumImage(album.value.id, id)
}

async function saveFootnote(id, text) {
  await store.updateAlbumFootnote(album.value.id, id, text)
}

async function exportAlbum() {
  const a = album.value
  if (!a || !a.images.length) { alert('没有图片'); return }

  const PAD = 30, TITLE_H = 60, FOOTNOTE_H = 32, GAP = 14, TITLE_GAP = 30, MAX_W = 800
  const COLS = exportCols.value
  const UNI_ASPECT = 4 / 3

  const imgs = []
  for (const img of a.images) {
    const i = new Image()
    i.src = URL.createObjectURL(img.data)
    await new Promise(r => { i.onload = r })
    imgs.push({ img: i, footnote: img.footnote || '' })
  }

  const title = a.name || '图鉴'
  const colW = (MAX_W - PAD * 2 - GAP * (COLS - 1)) / COLS
  const cellH = colW / UNI_ASPECT

  const rows = Math.ceil(imgs.length / COLS)
  const totalH = PAD + TITLE_H + TITLE_GAP + rows * (cellH + FOOTNOTE_H + GAP) + PAD

  const canvas = document.createElement('canvas')
  canvas.width = MAX_W
  canvas.height = totalH
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#333'
  ctx.font = 'bold 34px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, canvas.width / 2, PAD + TITLE_H * 0.68)

  let y = PAD + TITLE_H + TITLE_GAP
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c
      if (idx >= imgs.length) break
      const { img, footnote } = imgs[idx]
      const x = PAD + c * (colW + GAP)
      const sw = img.naturalWidth, sh = img.naturalHeight
      const srcAspect = sw / sh
      let sx, sy, ssw, ssh
      if (srcAspect > UNI_ASPECT) {
        ssh = sh; ssw = ssh * UNI_ASPECT
        sx = (sw - ssw) / 2; sy = 0
      } else {
        ssw = sw; ssh = ssw / UNI_ASPECT
        sx = 0; sy = (sh - ssh) / 2
      }
      ctx.drawImage(img, sx, sy, ssw, ssh, x, y, colW, cellH)
      if (footnote) {
        ctx.fillStyle = '#666'
        ctx.font = '13px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(footnote, x + colW / 2, y + cellH + 18)
      }
    }
    y += cellH + FOOTNOTE_H + GAP
  }

  const link = document.createElement('a')
  link.download = `${title}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
  for (const { img } of imgs) URL.revokeObjectURL(img.src)
}
</script>

<style scoped>
.album{padding-top:4px}
.album-top{margin-bottom:16px}
.album-title-input{width:100%;font-size:24px;font-weight:700;border:none;background:none;outline:none;color:var(--text);padding:4px 0}
.album-actions{display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap}
.upload-btn{position:relative;overflow:hidden}
.export-cols{display:flex;align-items:center;gap:4px;margin-left:auto}
.ec-label{font-size:12px;color:var(--text2)}
.image-list{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.image-card{position:relative;padding:8px;border-radius:var(--radius)}
.album-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;display:block}
.img-footnote{margin-top:8px}
.footnote-input{width:100%;border:none;background:var(--bg);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);outline:none}
.footnote-input:focus{background:var(--primary-bg)}
.img-del{position:absolute;top:8px;right:8px;width:28px;height:28px;border:none;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.6}
.img-del:hover{opacity:1}
</style>
