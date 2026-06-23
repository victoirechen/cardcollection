<template>
  <div class="editor" v-if="image">
    <div class="image-wrap">
      <img :src="imgUrl" alt="" />
      <div class="overlay" v-if="editRows > 0">
        <div v-for="cell in allCells" :key="'c-' + cell.row + '-' + cell.col"
          class="ocell" :class="{ owned: cell.owned, ignored: cell.ignored }"
          :style="cellStyle(cell)"
          @pointerdown.prevent="onCellDown(cell, $event)"
          @pointerup.prevent="onCellUp(cell)"
          @contextmenu.prevent>
          <svg v-if="cell.owned" class="check" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-if="cell.ignored" class="ign-mark">✕</span>
        </div>
      </div>
    </div>

    <div class="row-select-bar" v-if="editRows > 0">
      <button v-for="ri in editRows" :key="'rs'+ri" class="rs-btn" @click="setRowOwned(ri-1)" title="全设为已拥有">行{{ ri+1 }} ✓</button>
    </div>

    <div class="hint">点击小卡切换拥有状态 · 已拥有的会变灰打勾</div>

    <div class="toolbar">
      <div class="toolbar-row">
        <label class="tool-label">
          行
          <div class="stepper">
            <button class="step-btn" @click="adjustRows(-1)">−</button>
            <span class="step-val">{{ editRows }}</span>
            <button class="step-btn" @click="adjustRows(1)">+</button>
          </div>
        </label>
        <div class="owned-badge">
          {{ ownedCount }}/{{ totalCellCount }}
          <span style="font-size:11px;color:var(--text2)">已拥有</span>
        </div>
        <button class="btn btn-sm btn-outline" @click="exportUnowned">📷 导出</button>
      </div>

      <div class="per-row">
        <div class="per-row-label">每行卡片数</div>
        <div class="per-row-grid">
          <div v-for="(nc, ri) in editColsPerRow" :key="'r' + ri" class="row-editor">
            <span class="row-label">行{{ ri+1 }}</span>
            <div class="stepper sm">
              <button class="step-btn" @click="adjustCol(ri, -1)">−</button>
            <span class="step-val">{{ nc }}</span>
            <button class="step-btn" @click="adjustCol(ri, 1)">+</button>
          </div>
        </div>
        </div>
      </div>

      <input class="input" v-model="editCaption" placeholder="批注" @blur="saveCaption" style="margin-top:8px" />
    </div>
  </div>
  <div v-else class="empty-state">加载中...</div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/appStore.js'

const route = useRoute()
const store = useAppStore()
if (!store.loaded) store.load()

const col = computed(() => store.getCollection(route.params.collectionId))
const image = computed(() => {
  const c = col.value
  return c ? c.images.find(i => i.id === route.params.imageId) : null
})

const editRows = ref(1)
const editColsPerRow = ref([1])
const editCaption = ref('')
const savedBounds = ref(null) // { rowBounds, rowStarts, rowEnds, cardW, cardH }
const forceTick = ref(0)

function syncForm() {
  const img = image.value
  if (img) {
    editRows.value = img.rows
    editColsPerRow.value = [...(img.colsPerRow || new Array(img.rows).fill(img.cols || 1))]
    editCaption.value = img.caption || ''
    if (img.rowBounds && img.rowStarts && img.rowEnds) {
      savedBounds.value = { rowBounds: img.rowBounds, rowStarts: img.rowStarts, rowEnds: img.rowEnds, cardW: img.cardW, cardH: img.cardH }
    } else {
      savedBounds.value = null
    }
  }
}
watch(image, syncForm, { immediate: true })

const ownedCount = computed(() => image.value ? image.value.cells.filter(c => c.owned).length : 0)
const totalCellCount = computed(() => editColsPerRow.value.reduce((s, n) => s + n, 0))

const allCells = computed(() => {
  forceTick.value // ensure reactivity on mutation
  const cells = []
  for (let r = 0; r < editRows.value; r++) {
    const nc = editColsPerRow.value[r] || 1
    for (let c = 0; c < nc; c++) {
      const img = image.value
      const existing = img ? img.cells.find(cl => cl.row === r && cl.col === c) : null
      cells.push({ row: r, col: c, owned: existing ? existing.owned : false, ignored: existing ? existing.ignored : false })
    }
  }
  return cells
})

function cellStyle(cell) {
  const cols = editColsPerRow.value[cell.row] || 1
  const sb = savedBounds.value
  if (sb) {
    const rb = sb.rowBounds, rs = sb.rowStarts, re = sb.rowEnds
    const rIdx = cell.row
    const top = rb[rIdx], bottom = rb[rIdx + 1]
    const left = rs[rIdx] || 0, right = re[rIdx] || 100
    const colW = (right - left) / cols
    return {
      position: 'absolute',
      top: top + '%',
      left: (left + colW * cell.col) + '%',
      width: colW + '%',
      height: (bottom - top) + '%'
    }
  }
  const pct = 100
  return {
    position: 'absolute',
    top: (cell.row / editRows.value * pct) + '%',
    left: (cell.col / cols * pct) + '%',
    width: (pct / cols) + '%',
    height: (pct / editRows.value) + '%'
  }
}

const imgUrl = ref('')
watch(image, (img) => {
  if (imgUrl.value) URL.revokeObjectURL(imgUrl.value)
  imgUrl.value = img ? URL.createObjectURL(img.data) : ''
}, { immediate: true })

onBeforeUnmount(() => { if (imgUrl.value) URL.revokeObjectURL(imgUrl.value); clearTimer() })

let pressTimer = null
let pressTarget = null

function clearTimer() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; pressTarget = null } }

async function toggle(cell) {
  const c = col.value; const img = image.value
  if (c && img) await store.toggleCell(c.id, img.id, cell.row, cell.col)
}

function onCellDown(cell, e) {
  pressTarget = cell
  clearTimer()
  pressTimer = setTimeout(() => {
    if (pressTarget) {
      store.toggleIgnoreCell(col.value.id, image.value.id, pressTarget.row, pressTarget.col)
      pressTimer = null; pressTarget = null
    }
  }, 400)
}

function onCellUp(cell) {
  if (pressTimer) {
    clearTimer()
    toggle(cell)
  }
}

function adjustRows(delta) {
  const nv = Math.max(1, Math.min(20, editRows.value + delta))
  editRows.value = nv
  while (editColsPerRow.value.length < nv) editColsPerRow.value.push(1)
  editColsPerRow.value = editColsPerRow.value.slice(0, nv)
  saveLayout()
}

function adjustCol(ri, delta) {
  const nv = Math.max(1, Math.min(20, (editColsPerRow.value[ri] || 1) + delta))
  editColsPerRow.value[ri] = nv
  editColsPerRow.value = [...editColsPerRow.value]
  saveLayout()
}

let saveTimer = null
function saveLayout() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const c = col.value; const img = image.value
    if (c && img) {
      await store.resizeGrid(c.id, img.id, editRows.value, editColsPerRow.value)
    }
  }, 300)
}

async function setRowOwned(ri){
  const c=col.value;const img=image.value
  if(!c||!img)return
  const nc=editColsPerRow.value[ri]||1
  const cells=[]
  for(let co=0;co<nc;co++){
    let cell=img.cells.find(cl=>cl.row===ri&&cl.col===co)
    if(!cell){cell={row:ri,col:co,owned:true,ignored:false};img.cells.push(cell)}
    cells.push(cell)
  }
  const allOwned=cells.every(cl=>cl.owned)
  for(const cell of cells)cell.owned=!allOwned
  await store.saveCollection(c.id)
  forceTick.value++
}

async function saveCaption() {
  const c = col.value; const img = image.value
  if (c && img) await store.updateCaption(c.id, img.id, editCaption.value)
}

async function exportUnowned(){
  const cells=store.getUnownedCells(col.value.id)
  if(!cells.length){alert('没有未拥有的卡');return}
  const seen=new Set(),unique=[]
  for(const c of cells){const k=`${c.imageId}-${c.row}-${c.col}`;if(!seen.has(k)){seen.add(k);unique.push(c)}}
  const TARGET_W=300,GAP=6,MAX_COLS=10
  const cc=Math.min(MAX_COLS,unique.length),rr=Math.ceil(unique.length/cc)
  const fi=unique[0].image
  let ar=1.4;if(fi.cardW&&fi.cardH)ar=fi.cardH/fi.cardW
  const cards=[]
  for(const cell of unique){
    const img=await new Promise((res,rej)=>{
      const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(cell.image.data)
    })
    const sb=cell.image.rowBounds?{rowBounds:cell.image.rowBounds,rowStarts:cell.image.rowStarts,rowEnds:cell.image.rowEnds}:null
    const nw=img.naturalWidth,nh=img.naturalHeight,ri=cell.row,ci=cell.col
    let sx,sy,sw,sh
    if(sb){
      const t=sb.rowBounds[ri],b=sb.rowBounds[ri+1],l=sb.rowStarts[ri]||0,r=sb.rowEnds[ri]||100
      const cpr=cell.image.colsPerRow[ri]||1;const cw=(r-l)/cpr
      sx=(l+ci*cw)/100*nw;sy=t/100*nh;sw=cw/100*nw;sh=(b-t)/100*nh
    }else{
      const cpr=cell.image.colsPerRow[ri]||1;const rrr=cell.image.rows||1
      sx=ci/cpr*nw;sy=ri/rrr*nh;sw=nw/cpr;sh=nh/rrr
    }
    const ch=Math.round(TARGET_W*ar);const c=document.createElement('canvas');c.width=TARGET_W;c.height=ch
    c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,TARGET_W,ch)
    cards.push(c);URL.revokeObjectURL(img.src)
  }
  const out=document.createElement('canvas')
  out.width=cc*(TARGET_W+GAP)+GAP;out.height=rr*(cards[0].height+GAP)+GAP
  const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height)
  for(let i=0;i<cards.length;i++){const x=GAP+(i%cc)*(TARGET_W+GAP),y=GAP+Math.floor(i/cc)*(cards[0].height+GAP);ctx.drawImage(cards[i],x,y)}
  const link=document.createElement('a');link.download=`${col.value.name}_unowned.png`;link.href=out.toDataURL('image/png');link.click()
}
</script>

<style scoped>
.editor { padding-top: 4px; }
.toolbar { background: var(--surface); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); margin-bottom: 12px; }
.toolbar-row { display: flex; align-items: center; gap: 16px; }
.tool-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text2); }
.stepper { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.stepper.sm { }
.step-btn { width: 32px; height: 32px; border: none; background: none; font-size: 16px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center; }
.step-btn:active { background: var(--bg); }
.step-val { width: 36px; text-align: center; font-size: 15px; font-weight: 500; color: var(--text); }
.owned-badge { margin-left: auto; font-size: 15px; font-weight: 600; color: var(--primary); display: flex; flex-direction: column; align-items: center; line-height: 1.2; }

.per-row { margin-top: 10px; }
.per-row-label { font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
.per-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.row-editor { display: flex; align-items: center; gap: 6px; }
.row-label { font-size: 13px; color: var(--text2); min-width: 32px; }

.image-wrap { position: relative; display: inline-block; max-width: 100%; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
.image-wrap img { display: block; max-width: 100%; height: auto; }
.overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.ocell {
  border: 0.5px solid rgba(255,255,255,0.3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s;
}
.ocell:hover { background: rgba(108,92,231,0.12); }
.ocell.owned { background: rgba(0,0,0,0.5); }
.ocell.owned:hover { background: rgba(0,0,0,0.55); }
.ocell.ignored { background: repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,107,107,0.3) 3px, rgba(255,107,107,0.3) 6px); }
.check { opacity: 0.8; pointer-events: none; }
.ign-mark { color: rgba(255,107,107,0.9); font-size: 28px; font-weight: bold; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.hint { font-size: 12px; color: var(--text2); text-align: center; margin-top: 12px; }
.row-select-bar{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}
.rs-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border:none;border-radius:6px;background:var(--primary);color:#fff;font-size:12px;cursor:pointer;user-select:none}
.rs-btn:active{opacity:.7}
</style>
