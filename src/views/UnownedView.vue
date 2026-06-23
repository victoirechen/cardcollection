<template>
  <div class="unowned" v-if="col">
    <div class="unowned-header">
      <span class="unowned-count">共 {{ cells.length }} 张未拥有</span>
    </div>

    <div v-if="cells.length === 0" class="empty-state">
      <p>全部集齐！没有未拥有的卡片</p>
    </div>

    <div class="grid" v-else>
      <div v-for="(item, idx) in cells" :key="'u-' + idx" class="cell-item">
        <div class="cell-img" :style="cellStyle(item.image, item.row, item.col)"></div>
        <div class="cell-label">{{ item.image.caption || '卡片' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/appStore.js'

const route = useRoute()
const store = useAppStore()
if (!store.loaded) store.load()

const col = computed(() => store.getCollection(route.params.id))
const cells = computed(() => store.getUnownedCells(route.params.id))

const urlCache = {}
function getUrl(img) {
  if (!urlCache[img.id]) urlCache[img.id] = URL.createObjectURL(img.data)
  return urlCache[img.id]
}
onBeforeUnmount(() => { for (const k of Object.keys(urlCache)) URL.revokeObjectURL(urlCache[k]) })

function cellStyle(img, row, col) {
  if (!img) return {}
  const url = getUrl(img)
  const cols = (img.colsPerRow && img.colsPerRow[row]) || img.cols || 1
  const rows = img.rows || 1
  const w = img.naturalWidth || 1
  const h = img.naturalHeight || 1
  const ar = (w / cols) + ' / ' + (h / rows)
  return {
    backgroundImage: 'url(' + url + ')',
    backgroundSize: (cols * 100) + '% ' + (rows * 100) + '%',
    backgroundPosition: (-col * 100) + '% ' + (-row * 100) + '%',
    aspectRatio: ar
  }
}
</script>

<style scoped>
.unowned { padding-top: 4px; }
.unowned-header { margin-bottom: 12px; }
.unowned-count { font-size: 14px; color: var(--text2); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.cell-item { background: var(--surface); border-radius: var(--radius-sm); overflow: hidden; box-shadow: var(--shadow); }
.cell-img { width: 100%; background-repeat: no-repeat; background-position: center; background-size: cover; display: block; }
.cell-label { font-size: 12px; color: var(--text2); text-align: center; padding: 6px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
