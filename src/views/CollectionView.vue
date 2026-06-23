<template>
  <div class="detail" v-if="col">
    <div class="detail-name">
      <input class="input-name" v-model="editName" @blur="saveName" placeholder="图鉴名称" />
    </div>
    <div class="stats-row">
      <span class="stat">{{ col.images.length }} 张图</span>
      <span class="stat">{{ ownTotal }}/{{ cardTotal }} 已拥有</span>
      <button v-if="unownedCount>0" class="btn btn-sm btn-outline" @click="$router.push(`/collection/${col.id}/unowned`)">未拥有({{ unownedCount }})</button>
      <button v-if="unownedCount>0" class="btn btn-sm btn-outline" @click="exportUnowned">📷 导出图片</button>
    </div>

    <div class="section-label">添加图片</div>
    <div class="upload-area card" @click="triggerFile" v-if="!preview">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color:var(--text2)"><path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <div style="margin-top:8px; font-size:15px; color:var(--text2)">点击上传卡片图鉴</div>
    </div>

    <div class="preview-panel" v-if="preview">
      <div class="hint-bar">
        <template v-if="!selBox && !hasGrid">👆 在图上拖拽框出任一张卡，确定卡片尺寸</template>
        <template v-else-if="selBox && !hasGrid">已选卡: {{ cardW }}×{{ cardH }}px — 拖绿色边框可调整范围</template>
        <template v-else-if="hasGrid">← → 绿线 = 行左右边界（可拖） · 芯片数字 = 改该行列数 · 红边 = 裁切范围</template>
      </div>
      <div class="preview-img-wrap" ref="imgWrap">
        <img :src="preview" ref="previewImg" @load="onLoaded"
          @pointerdown.prevent="onDown" @pointermove.prevent="onMove" @pointerup="onUp"
          style="touch-action:none; user-select:none" />

        <div v-if="drawing" class="draw-box" :style="drawBoxStyle"></div>

        <div v-if="selBox" class="sel-box" :style="selBoxStyle">
          <div class="sb-handle sb-t" @pointerdown.prevent="selStartResize('t')"></div>
          <div class="sb-handle sb-b" @pointerdown.prevent="selStartResize('b')"></div>
          <div class="sb-handle sb-l" @pointerdown.prevent="selStartResize('l')"></div>
          <div class="sb-handle sb-r" @pointerdown.prevent="selStartResize('r')"></div>
        </div>

        <div v-if="hasGrid" class="dim-mask" :style="dimStyle"></div>

        <template v-if="hasGrid">
          <div class="gl hr edge" :style="{top:cont.top+'%'}" @pointerdown.prevent="startDrag('top')"></div>
          <div class="gl hr edge" :style="{top:cont.bottom+'%'}" @pointerdown.prevent="startDrag('bot')"></div>
          <div class="gl vt edge" :style="{left:cont.left+'%',top:cont.top+'%',height:(cont.bottom-cont.top)+'%'}" @pointerdown.prevent="startDrag('left')"></div>
          <div class="gl vt edge" :style="{left:cont.right+'%',top:cont.top+'%',height:(cont.bottom-cont.top)+'%'}" @pointerdown.prevent="startDrag('right')"></div>
          <div v-for="(rb,i) in handleLines" :key="'hr'+i" class="gl hr" :style="{top:rb+'%'}" @pointerdown.prevent="startDrag('row',i)"></div>
          <div v-for="cl in colHandles" :key="'vc'+cl.ri+'x'+cl.ci" class="gl vt" :style="{left:cl.left+'%',top:cl.top+'%',height:cl.height+'%'}" @pointerdown.prevent="startDrag('col',cl.ri,cl.ci)"></div>
          <div v-for="ri in rowRange" :key="'rs'+ri" class="gl rs" :style="{left:rowStartLeft(ri)+'%',top:rowBounds[ri]+'%',height:(rowBounds[ri+1]-rowBounds[ri])+'%'}" @pointerdown.prevent="startDrag('rowStart',ri)">
            <div class="rs-arrow"></div>
          </div>
          <div v-for="ri in rowRange" :key="'re'+ri" class="gl re" :style="{left:rowEndLeft(ri)+'%',top:rowBounds[ri]+'%',height:(rowBounds[ri+1]-rowBounds[ri])+'%'}" @pointerdown.prevent="startDrag('rowEnd',ri)">
            <div class="re-arrow"></div>
          </div>
        </template>

        <div class="row-chips" v-if="hasGrid">
          <div v-for="ri in rowRange" :key="'rc'+ri" class="chip" :class="{dim:ignRows.has(ri)}" :style="{top:chipTop(ri)+'%'}">
            <input class="chip-input" type="number" min="1" max="30" :value="colCounts[ri]" @input="changeColCount(ri,$event.target.value)" @click.stop />
            <span class="chip-ign" @click.stop="toggleIgnoreRow(ri)">✕</span>
          </div>
        </div>
      </div>

      <div class="preview-bar" v-if="hasGrid">
        <span style="font-size:13px">{{ rowBounds.length-1 }}行 × 共 {{ totalC }}卡 · 卡 {{ cardW }}×{{ cardH }}px</span>
        <div class="margin-row">
          <label class="mr">左</label><input class="inp-sm" type="number" v-model.number="cont.left" min="0" :max="cont.right-2" @change="onEdgeChange"/>%
          <label class="mr">右</label><input class="inp-sm" type="number" :value="Math.round(100-cont.right)" min="0" @change="cont.right=Math.max(cont.left+2,Math.min(100,100-Number($event.target.value)));onEdgeChange()"/>%
          <label class="mr">上</label><input class="inp-sm" type="number" v-model.number="cont.top" min="0" :max="cont.bottom-2" @change="onEdgeChange"/>%
          <label class="mr">下</label><input class="inp-sm" type="number" :value="Math.round(100-cont.bottom)" min="0" @change="cont.bottom=Math.max(cont.top+2,Math.min(100,100-Number($event.target.value)));onEdgeChange()"/>%
        </div>
        <input class="input" v-model="newCaption" placeholder="批注" style="margin-top:4px" />
        <div class="upload-actions">
          <button class="btn btn-ghost" @click="reAutoDetect">自动检测</button>
          <button class="btn btn-ghost" @click="selBox=null;hasGrid=false">重选卡片</button>
          <button class="btn btn-ghost" @click="cancelUpload">取消</button>
          <button class="btn btn-primary" @click="confirmAdd">确认添加</button>
        </div>
      </div>
      <div class="preview-bar" v-else-if="selBox">
        <div class="upload-actions" style="justify-content:space-between">
          <span style="font-size:13px">已选: {{ cardW }}×{{ cardH }}px</span>
          <button class="btn btn-primary" @click="computeGrid">应用 → 检测行列</button>
        </div>
      </div>
    </div>

    <div class="section-label" style="margin-top:24px">图片列表</div>
    <div class="image-list" v-if="col.images.length">
      <div v-for="img in col.images" :key="img.id" class="image-item card" @click="$router.push(`/collection/${col.id}/image/${img.id}`)">
        <div class="image-preview"><img :src="getUrl(img)" /></div>
        <div class="image-info">
          <div class="image-caption">{{ img.caption||'无批注' }}</div>
          <div class="image-stats">{{ store.ownedCards(img) }}/{{ store.totalCards(img) }} · {{ img.rows }}行</div>
        </div>
        <button class="btn-del" @click.stop="removeImg(img.id)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round"/></svg></button>
      </div>
    </div>
    <div v-else class="empty-state" style="margin-top:20px">还没有添加图片</div>
    <div class="detail-actions" style="margin-top:24px"><button class="btn btn-block btn-danger" @click="confirmDel">删除整个图鉴</button></div>
  </div>
</template>

<script setup>
import { ref,computed,onMounted,watch,onBeforeUnmount,reactive } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore.js'
import { detectGrid } from '../utils/gridDetector.js'

const route=useRoute();const router=useRouter();const store=useAppStore()
onMounted(()=>{if(!store.loaded)store.load()})

const col=computed(()=>store.getCollection(route.params.id))
const editName=ref('');watch(()=>col.value,c=>{if(c)editName.value=c.name},{immediate:true})
const cardTotal=computed(()=>col.value?col.value.images.reduce((s,i)=>s+store.totalCards(i),0):0)
const ownTotal=computed(()=>col.value?col.value.images.reduce((s,i)=>s+store.ownedCards(i),0):0)
const unownedCount=computed(()=>cardTotal.value-ownTotal.value)
function saveName(){if(col.value&&editName.value.trim())store.updateCollectionName(col.value.id,editName.value.trim())}

const preview=ref(null);const previewFile=ref(null);const previewImg=ref(null);const newCaption=ref('')
const cont=reactive({left:0,top:0,right:100,bottom:100})
const rowBounds=ref([0,100]);const colBoundsList=ref([]);const ignRows=ref(new Set())
const cardW=ref(0);const cardH=ref(0)
const hasGrid=ref(false);const selBox=ref(null)
const imgWrap=ref(null);const dragType=ref('');const dragRi=ref(-1);const dragCi=ref(-1)
const rowStartX=ref([]);const rowEndX=ref([])

const drawing=ref(false);const bStart=ref({x:0,y:0});const bEnd=ref({x:0,y:0})

// selBox resize
const selResizing=ref(false);const selResizeDir=ref('')

function triggerFile(){
  const i=document.createElement('input');i.type='file';i.accept='image/*'
  i.onchange=e=>{const f=e.target.files[0];if(!f)return;previewFile.value=f;preview.value=URL.createObjectURL(f);resetAll()};i.click()
}

function resetAll(){cont.left=0;cont.top=0;cont.right=100;cont.bottom=100;rowBounds.value=[0,100];colBoundsList.value=[];ignRows.value=new Set();cardW.value=0;cardH.value=0;hasGrid.value=false;selBox.value=null;rowStartX.value=[];rowEndX.value=[]}

function onLoaded(){
  const img=previewImg.value;if(!img)return
  const r=detectGrid(img)
  if(r.contentRect&&img){cont.left=Math.max(0,r.contentRect.left/img.naturalWidth*100);cont.top=Math.max(0,r.contentRect.top/img.naturalHeight*100);cont.right=Math.min(100,r.contentRect.right/img.naturalWidth*100);cont.bottom=Math.min(100,r.contentRect.bottom/img.naturalHeight*100)}
}

function onEdgeChange(){if(hasGrid.value)rebuildGrid()}

// --- Box drawing ---
const drawBoxStyle=computed(()=>{
  if(!drawing.value)return{display:'none'}
  const l=Math.min(bStart.value.x,bEnd.value.x),t=Math.min(bStart.value.y,bEnd.value.y)
  const r=Math.max(bStart.value.x,bEnd.value.x),b=Math.max(bStart.value.y,bEnd.value.y)
  return{left:l+'%',top:t+'%',width:(r-l)+'%',height:(b-t)+'%',position:'absolute',border:'2px dashed var(--primary)',background:'rgba(108,92,231,0.15)',zIndex:20,pointerEvents:'none'}
})
const selBoxStyle=computed(()=>{
  if(!selBox.value)return{display:'none'}
  const s=selBox.value
  return{left:s.left+'%',top:s.top+'%',width:(s.right-s.left)+'%',height:(s.bottom-s.top)+'%',position:'absolute',border:'3px solid #43C6AC',background:'rgba(67,198,172,0.1)',zIndex:20,pointerEvents:'none'}
})

function onDown(e){
  if(hasGrid.value)return
  if(selBox.value)return // selBox handles handle their own drag
  const img=previewImg.value;if(!img)return
  const rect=img.getBoundingClientRect()
  bStart.value={x:(e.clientX-rect.left)/rect.width*100,y:(e.clientY-rect.top)/rect.height*100}
  bEnd.value={...bStart.value};drawing.value=true
  document.addEventListener('pointerup',globalUp)
}

function onMove(e){
  if(!drawing.value||hasGrid.value)return
  const img=previewImg.value;if(!img)return
  const rect=img.getBoundingClientRect()
  bEnd.value={x:(e.clientX-rect.left)/rect.width*100,y:(e.clientY-rect.top)/rect.height*100}
}

function onUp(){finishBox()}

function globalUp(){finishBox();document.removeEventListener('pointerup',globalUp)}

function finishBox(){
  if(!drawing.value)return;drawing.value=false
  const l=Math.min(bStart.value.x,bEnd.value.x),t=Math.min(bStart.value.y,bEnd.value.y)
  const r=Math.max(bStart.value.x,bEnd.value.x),b=Math.max(bStart.value.y,bEnd.value.y)
  if(r-l<2||b-t<2)return
  const img=previewImg.value;if(!img)return
  cardW.value=Math.round((r-l)/100*img.naturalWidth)
  cardH.value=Math.round((b-t)/100*img.naturalHeight)
  selBox.value={left:l,top:t,right:r,bottom:b}
}

// --- selBox resize ---
function selStartResize(dir){
  selResizing.value=true;selResizeDir.value=dir
  document.addEventListener('pointermove',selOnMove)
  document.addEventListener('pointerup',selOnUp)
}
function selOnMove(e){
  if(!selResizing.value||!selBox.value)return
  const w=imgWrap.value;if(!w)return
  const rect=w.getBoundingClientRect()
  const px=Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100))
  const py=Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))
  const s={...selBox.value}
  const dir=selResizeDir.value
  const minSz=0.5
  if(dir==='l'){if(px<s.right-minSz)s.left=px}
  else if(dir==='r'){if(px>s.left+minSz)s.right=px}
  else if(dir==='t'){if(py<s.bottom-minSz)s.top=py}
  else if(dir==='b'){if(py>s.top+minSz)s.bottom=py}
  selBox.value=s
  const img=previewImg.value
  if(img){cardW.value=Math.round((s.right-s.left)/100*img.naturalWidth);cardH.value=Math.round((s.bottom-s.top)/100*img.naturalHeight)}
}
function selOnUp(e){
  selResizing.value=false;selResizeDir.value=''
  document.removeEventListener('pointermove',selOnMove)
  document.removeEventListener('pointerup',selOnUp)
}

// --- Compute grid from card size ---
function computeGrid(){
  if(!cardW.value||!cardH.value)return
  buildGrid()
  hasGrid.value=true
}

function buildGrid(){
  const img=previewImg.value;if(!img)return
  const cw=cont.right-cont.left,ch=cont.bottom-cont.top
  const gapW=Math.round(cardW.value*0.08)
  const slotW=cardW.value/img.naturalWidth*100+(gapW/img.naturalWidth*100)
  const slotH=cardH.value/img.naturalHeight*100+(Math.round(cardH.value*0.08)/img.naturalHeight*100)
  const r=detectGrid(img)
  const rows=r.rows>1?r.rows:Math.max(1,Math.round(ch/slotH))
  const defCols=r.colsPerRow||[]

  const rb=[cont.top]
  for(let i=1;i<rows;i++)rb.push(cont.top+ch*i/rows)
  rb.push(cont.bottom)
  rowBounds.value=rb

  rowStartX.value=Array.from({length:rows},()=>cont.left)
  rowEndX.value=Array.from({length:rows},()=>cont.right)

  const cbl=[]
  for(let ri=0;ri<rows;ri++){
    const dc=defCols[ri]||Math.max(1,Math.round((cw+slotW/2)/slotW))
    const startX=rowStartX.value[ri]??cont.left
    const endX=rowEndX.value[ri]??cont.right
    const nc=Math.max(1,Math.min(20,dc))
    const cb=[startX]
    for(let ci=1;ci<nc;ci++)cb.push(Math.min(endX-0.5,startX+slotW*ci))
    cb.push(endX)
    cbl.push(cb)
  }
  colBoundsList.value=cbl
}

function rebuildGrid(){if(hasGrid.value)buildGrid()}

const rowRange=computed(()=>Array.from({length:Math.max(0,rowBounds.value.length-1)},(_,i)=>i))
const colCounts=computed(()=>colBoundsList.value.map(cb=>Math.max(1,cb.length-1)))
const totalC=computed(()=>colCounts.value.reduce((a,b)=>a+b,0))
const handleLines=computed(()=>rowBounds.value.slice(1,-1))
const colHandles=computed(()=>{const hs=[];for(let ri=0;ri<colBoundsList.value.length&&ri<rowBounds.value.length-1;ri++){const cb=colBoundsList.value[ri]||[];const t=rowBounds.value[ri],b=rowBounds.value[ri+1];for(let ci=1;ci<cb.length-1;ci++)hs.push({left:cb[ci],top:t,height:b-t,ri,ci})}return hs})
function chipTop(ri){return ri>=rowBounds.value.length-1?50:(rowBounds.value[ri]+rowBounds.value[ri+1])/2}
function rowStartLeft(ri){return rowStartX.value[ri]??cont.left}
function rowEndLeft(ri){return rowEndX.value[ri]??cont.right}
const dimStyle=computed(()=>({clipPath:`polygon(0 0,100% 0,100% 100%,0 100%,0 ${cont.top}%,${cont.left}% ${cont.top}%,${cont.left}% ${cont.bottom}%,${cont.right}% ${cont.bottom}%,${cont.right}% ${cont.top}%,100% ${cont.top}%,100% 0,0 0)`,background:'rgba(0,0,0,0.3)',position:'absolute',inset:0,pointerEvents:'none',zIndex:2}))

function startDrag(type,ri,ci){dragType.value=type;dragRi.value=ri??-1;dragCi.value=ci??-1;document.addEventListener('pointermove',onPointerMove);document.addEventListener('pointerup',onPointerUp)}
function onPointerMove(e){e.preventDefault();const w=imgWrap.value;if(!w)return;const rect=w.getBoundingClientRect();const px=((e.clientX-rect.left)/rect.width)*100,py=((e.clientY-rect.top)/rect.height)*100;const t=dragType.value
  if(t==='row'){const bi=dragRi.value+1;if(bi<=0||bi>=rowBounds.value.length-1)return;const v=[...rowBounds.value];v[bi]=Math.max(v[bi-1]+1,Math.min(v[bi+1]-1,py));rowBounds.value=v}
  else if(t==='col'){const ri=dragRi.value,ci=dragCi.value;if(ri<0||ri>=colBoundsList.value.length)return;const cb=[...colBoundsList.value[ri]];if(ci<=0||ci>=cb.length-1)return;cb[ci]=Math.max(cb[ci-1]+0.3,Math.min(cb[ci+1]-0.3,px));const list=[...colBoundsList.value];list[ri]=cb;colBoundsList.value=list}
  else if(t==='rowStart'){const ri=dragRi.value;if(ri<0)return;const startX=Math.max(cont.left,Math.min(cont.right-2,px));const list=[...rowStartX.value];list[ri]=startX;rowStartX.value=list;updateRowBounds(ri)}
  else if(t==='rowEnd'){const ri=dragRi.value;if(ri<0)return;const endX=Math.max(cont.left+2,Math.min(cont.right,px));const list=[...rowEndX.value];list[ri]=endX;rowEndX.value=list;updateRowBounds(ri)}
  else if(t==='left'){const v=Math.max(0,Math.min(cont.right-2,px));cont.left=v;rebuildGrid()}
  else if(t==='right'){const v=Math.max(cont.left+2,Math.min(100,px));cont.right=v;rebuildGrid()}
  else if(t==='top'){const v=Math.max(0,Math.min(cont.bottom-2,py));cont.top=v;rebuildGrid()}
  else if(t==='bot'){const v=Math.max(cont.top+2,Math.min(100,py));cont.bottom=v;rebuildGrid()}
}
function updateRowBounds(ri){
  const startX=rowStartX.value[ri]??cont.left
  const endX=rowEndX.value[ri]??cont.right
  const cb=colBoundsList.value[ri]
  if(!cb)return
  const nc=cb.length-1
  const w=endX-startX
  const step=w/nc
  const nb=[startX]
  for(let ci=1;ci<nc;ci++)nb.push(startX+step*ci)
  nb.push(endX)
  const list=[...colBoundsList.value];list[ri]=nb;colBoundsList.value=list
}
function onPointerUp(){dragType.value='';dragRi.value=-1;dragCi.value=-1;document.removeEventListener('pointermove',onPointerMove);document.removeEventListener('pointerup',onPointerUp)}

function toggleIgnoreRow(ri){const s=new Set(ignRows.value);if(s.has(ri))s.delete(ri);else s.add(ri);ignRows.value=s}
function changeColCount(ri,n){
  const nc=Math.max(1,Math.min(30,parseInt(n)||1))
  const cb=colBoundsList.value[ri]
  if(!cb)return
  const list=[...colBoundsList.value]
  if(nc===cb.length-1)return
  const startX=rowStartX.value[ri]??cont.left
  const endX=rowEndX.value[ri]??cont.right
  const w=endX-startX
  const step=w/nc
  const nb=[startX]
  for(let ci=1;ci<nc;ci++)nb.push(startX+step*ci)
  nb.push(endX)
  list[ri]=nb
  colBoundsList.value=list
}
function changeRowStart(ri,val){
  const v=Math.max(cont.left,Math.min((rowEndX.value[ri]??cont.right)-2,parseFloat(val)||cont.left))
  const list=[...rowStartX.value];list[ri]=v;rowStartX.value=list
  updateRowBounds(ri)
}
function changeRowEnd(ri,val){
  const v=Math.max((rowStartX.value[ri]??cont.left)+2,Math.min(cont.right,parseFloat(val)||cont.right))
  const list=[...rowEndX.value];list[ri]=v;rowEndX.value=list
  updateRowBounds(ri)
}
function reAutoDetect(){const img=previewImg.value;if(!img)return;onLoaded();computeGrid()}

async function confirmAdd(){
  if(!previewFile.value||!col.value)return
  const img=previewImg.value;let rect=null
  if(img)rect={left:Math.round(cont.left/100*img.naturalWidth),top:Math.round(cont.top/100*img.naturalHeight),right:Math.round(cont.right/100*img.naturalWidth),bottom:Math.round(cont.bottom/100*img.naturalHeight)}
  // Recalculate row bounds relative to cropped image
  const ch=cont.bottom-cont.top,cw=cont.right-cont.left
  const adjBounds=rowBounds.value.map(r=>(r-cont.top)/ch*100)
  const adjStarts=rowStartX.value.map(s=>(s-cont.left)/cw*100)
  const adjEnds=rowEndX.value.map(e=>(e-cont.left)/cw*100)
  await store.addImage(col.value.id,previewFile.value,rowBounds.value.length-1,colCounts.value,newCaption.value,rect,[...ignRows.value],adjBounds,adjStarts,adjEnds,cardW.value,cardH.value)
  cancelUpload()
}
function cancelUpload(){if(preview.value)URL.revokeObjectURL(preview.value);preview.value=null;previewFile.value=null;resetAll();newCaption.value=''}
onBeforeUnmount(()=>{if(dragType.value){document.removeEventListener('pointermove',onPointerMove);document.removeEventListener('pointerup',onPointerUp)}if(preview.value)URL.revokeObjectURL(preview.value);if(selResizing.value){document.removeEventListener('pointermove',selOnMove);document.removeEventListener('pointerup',selOnUp)}})
async function removeImg(id){if(confirm('确定删除这张图片？'))await store.removeImage(col.value.id,id)}
function confirmDel(){if(confirm('确定删除整个图鉴？所有数据将丢失。')){store.deleteCollection(col.value.id);router.push('/')}}

async function exportUnowned(){
  const cells=store.getUnownedCells(col.value.id)
  if(!cells.length){alert('没有未拥有的卡');return}
  // dedup by imageId+row+col
  const seen=new Set(),unique=[]
  for(const c of cells){const k=`${c.imageId}-${c.row}-${c.col}`;if(!seen.has(k)){seen.add(k);unique.push(c)}}
  const TARGET_W=300,GAP=6,MAX_COLS=10
  const cols=Math.min(MAX_COLS,unique.length),rows=Math.ceil(unique.length/cols)
  const firstImg=unique[0].image
  let ar=1.4
  if(firstImg.cardW&&firstImg.cardH)ar=firstImg.cardH/firstImg.cardW

  const cards=[]
  for(const cell of unique){
    const img=await new Promise((res,rej)=>{
      const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(cell.image.data)
    })
    const sb=cell.image.rowBounds?{rowBounds:cell.image.rowBounds,rowStarts:cell.image.rowStarts,rowEnds:cell.image.rowEnds}:null
    const nw=img.naturalWidth,nh=img.naturalHeight
    const ri=cell.row,ci=cell.col

    let sx,sy,sw,sh
    if(sb){
      const top=sb.rowBounds[ri],bottom=sb.rowBounds[ri+1]
      const left=sb.rowStarts[ri]||0,right=sb.rowEnds[ri]||100
      const cpr=cell.image.colsPerRow[ri]||1
      const cw=(right-left)/cpr
      sx=(left+ci*cw)/100*nw;sy=top/100*nh;sw=cw/100*nw;sh=(bottom-top)/100*nh
    }else{
      const cpr=cell.image.colsPerRow[ri]||1
      const rows=cell.image.rows||1
      sx=ci/cpr*nw;sy=ri/rows*nh;sw=nw/cpr;sh=nh/rows
    }
    const cardH=Math.round(TARGET_W*ar)
    const c=document.createElement('canvas');c.width=TARGET_W;c.height=cardH
    const ctx=c.getContext('2d');ctx.drawImage(img,sx,sy,sw,sh,0,0,TARGET_W,cardH)
    cards.push(c)
    URL.revokeObjectURL(img.src)
  }

  const out=document.createElement('canvas')
  out.width=cols*(TARGET_W+GAP)+GAP;out.height=rows*(cards[0].height+GAP)+GAP
  const ctx=out.getContext('2d')
  ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height)
  for(let i=0;i<cards.length;i++){
    const x=GAP+(i%cols)*(TARGET_W+GAP),y=GAP+Math.floor(i/cols)*(cards[0].height+GAP)
    ctx.drawImage(cards[i],x,y)
  }
  const link=document.createElement('a')
  link.download=`${col.value.name}_unowned.png`
  link.href=out.toDataURL('image/png')
  link.click()
}
const urlCache={}
function getUrl(img){if(!urlCache[img.id])urlCache[img.id]=URL.createObjectURL(img.data);return urlCache[img.id]}
onBeforeUnmount(()=>{for(const k of Object.keys(urlCache))URL.revokeObjectURL(urlCache[k])})
</script>

<style scoped>
.detail{padding-top:4px}
.input-name{font-size:22px;font-weight:700;border:none;padding:4px 0;width:100%;outline:none;background:transparent;border-bottom:2px solid transparent}
.input-name:focus{border-bottom-color:var(--primary)}
.stats-row{display:flex;gap:12px;align-items:center;margin-top:8px;font-size:13px;color:var(--text2);flex-wrap:wrap}
.section-label{font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;margin-top:16px}
.upload-area{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;cursor:pointer;border:2px dashed var(--border);transition:border-color .15s}
.upload-area:active{border-color:var(--primary)}
.preview-panel{display:flex;flex-direction:column;gap:6px}
.hint-bar{background:var(--surface);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;color:var(--text2);text-align:center}
.preview-img-wrap{position:relative;display:block;max-width:100%;border-radius:var(--radius-sm);overflow:hidden}
.preview-img-wrap img{display:block;max-width:100%;height:auto;user-select:none}

.gl{position:absolute;pointer-events:all;z-index:6;transition:background .1s}
.gl.hr{left:0;width:100%;height:5px;background:rgba(108,92,231,.35);margin-top:-2px;cursor:ns-resize}
.gl.vt{width:5px;background:rgba(108,92,231,.35);margin-left:-2px;cursor:ew-resize}
.gl.hr:hover,.gl.vt:hover,.gl.hr:active,.gl.vt:active{background:rgba(108,92,231,.8)}
.gl.edge{background:rgba(255,107,107,.5)!important;cursor:move!important}
.gl.edge:hover,.gl.edge:active{background:rgba(255,107,107,.9)!important}
.gl.rs{width:6px;background:rgba(67,198,172,.5);margin-left:-3px;cursor:ew-resize;z-index:7}
.gl.rs:hover,.gl.rs:active{background:rgba(67,198,172,.9)!important}
.rs-arrow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-right:6px solid rgba(67,198,172,.8);pointer-events:none}
.gl.re{width:6px;background:rgba(67,198,172,.5);margin-left:-3px;cursor:ew-resize;z-index:7}
.gl.re:hover,.gl.re:active{background:rgba(67,198,172,.9)!important}
.re-arrow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:6px solid rgba(67,198,172,.8);pointer-events:none}

.row-chips{position:absolute;top:0;right:0;left:0;bottom:0;pointer-events:none;z-index:12}
.chip{position:absolute;right:6px;transform:translateY(-50%);background:rgba(108,92,231,.85);border-radius:8px;padding:2px 6px;pointer-events:all}
.chip-input{color:#fff;font-size:14px;font-weight:600;width:26px;text-align:center;background:transparent;border:none;outline:none;padding:0;-moz-appearance:textfield;appearance:textfield;cursor:pointer}
.chip-input::-webkit-inner-spin-button,.chip-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.chip.dim{background:rgba(150,150,150,.6)}
.chip-ign{color:#fff;font-size:12px;cursor:pointer;margin-left:3px;opacity:.7;user-select:none;line-height:1}
.chip-ign:hover{opacity:1}
.per-row-inputs{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.row-item{display:flex;align-items:center;gap:2px}
.row-lbl{font-size:11px;color:var(--text2);white-space:nowrap}
.row-inp{width:38px;padding:3px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;text-align:center;outline:none;-moz-appearance:textfield;appearance:textfield}
.row-inp:focus{border-color:var(--primary)}
.row-inp::-webkit-inner-spin-button,.row-inp::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.preview-bar{background:var(--surface);border-radius:var(--radius-sm);padding:10px 14px;display:flex;flex-direction:column;gap:4px}
.margin-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--text2);margin-top:4px}
.mr{display:flex;align-items:center;gap:2px;white-space:nowrap}
.inp-sm{width:42px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;text-align:center;outline:none}
.inp-sm:focus{border-color:var(--primary)}
.upload-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}

.sb-handle{position:absolute;z-index:25;pointer-events:all}
.sb-t{top:-3px;left:0;right:0;height:6px;cursor:ns-resize}
.sb-b{bottom:-3px;left:0;right:0;height:6px;cursor:ns-resize}
.sb-l{left:-3px;top:0;bottom:0;width:6px;cursor:ew-resize}
.sb-r{right:-3px;top:0;bottom:0;width:6px;cursor:ew-resize}

.image-list{display:flex;flex-direction:column;gap:10px}
.image-item{display:flex;align-items:center;gap:12px;padding:10px;cursor:pointer}
.image-preview{width:60px;height:60px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--bg)}
.image-preview img{width:100%;height:100%;object-fit:cover}
.image-info{flex:1;min-width:0}
.image-caption{font-size:15px;font-weight:500}
.image-stats{font-size:12px;color:var(--text2);margin-top:2px}
.btn-del{background:none;border:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;flex-shrink:0}
.btn-del:active{background:rgba(255,107,107,.1)}
</style>
