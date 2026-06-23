import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadAll, save, remove as dbRemove, loadAlbums, saveAlbum, removeAlbum as dbRemoveAlbum } from './db.js'

let nextId = 1
function genId() {
  return String(nextId++).padStart(6, '0') + '-' + Date.now().toString(36)
}

export const useAppStore = defineStore('app', () => {
  const collections = ref([])
  const loaded = ref(false)

  async function load() {
    const data = await loadAll()
    collections.value = data
    loaded.value = true
  }

  async function createCollection(name) {
    const c = { id: genId(), name, createdAt: Date.now(), images: [] }
    collections.value.push(c)
    await save(c)
    return c
  }

  async function deleteCollection(id) {
    collections.value = collections.value.filter(c => c.id !== id)
    await dbRemove(id)
  }

  async function updateCollectionName(id, name) {
    const c = collections.value.find(c => c.id === id)
    if (c) { c.name = name; await save(c) }
  }

  function getCollection(id) {
    return collections.value.find(c => c.id === id)
  }

  function getCols(img) {
    return img.colsPerRow || new Array(img.rows).fill(img.cols || 1)
  }

  function totalCards(img) {
    return img.cells.filter(c => !c.ignored).length
  }

  function ownedCards(img) {
    return img.cells.filter(c => c.owned && !c.ignored).length
  }

  async function addImage(collectionId, file, rows, colsPerRow, caption, contentRect, ignoredRows, rowBounds, rowStarts, rowEnds, cardW, cardH) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return

    const img = new Image()
    const url1 = URL.createObjectURL(file)
    await new Promise((resolve) => { img.onload = resolve; img.src = url1 })
    URL.revokeObjectURL(url1)

    const origW = img.naturalWidth, origH = img.naturalHeight
    let croppedBlob = file
    let finalW = origW, finalH = origH

    if (contentRect) {
      const cx = Math.max(0, Math.round(contentRect.left))
      const cy = Math.max(0, Math.round(contentRect.top))
      const cw = Math.min(origW - cx, Math.round(contentRect.right - cx))
      const ch = Math.min(origH - cy, Math.round(contentRect.bottom - cy))

      if (cw > 10 && ch > 10 && (cx > 0 || cy > 0 || cx + cw < origW || cy + ch < origH)) {
        croppedBlob = await new Promise((resolve) => {
          const canvas = document.createElement('canvas')
          canvas.width = cw; canvas.height = ch
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch)
          canvas.toBlob(resolve, 'image/jpeg', 0.92)
        })
        finalW = cw; finalH = ch
      }
    }

    const cells = []
    const ignSet = new Set(ignoredRows || [])
    for (let r = 0; r < rows; r++) {
      const nc = colsPerRow ? colsPerRow[r] : 1
      for (let co = 0; co < nc; co++) {
        cells.push({ row: r, col: co, owned: false, ignored: ignSet.has(r) })
      }
    }

    const imageObj = {
      id: genId(),
      data: croppedBlob,
      caption: caption || '',
      rows,
      colsPerRow: colsPerRow || new Array(rows).fill(1),
      cells,
      naturalWidth: finalW,
      naturalHeight: finalH,
      ...(rowBounds ? { rowBounds, rowStarts, rowEnds, cardW, cardH } : {})
    }
    c.images.push(imageObj)
    await save(c)
    return imageObj
  }

  async function removeImage(collectionId, imageId) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return
    c.images = c.images.filter(img => img.id !== imageId)
    await save(c)
  }

  async function updateCaption(collectionId, imageId, caption) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return
    const img = c.images.find(i => i.id === imageId)
    if (img) { img.caption = caption; await save(c) }
  }

  async function toggleCell(collectionId, imageId, row, col) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return
    const img = c.images.find(i => i.id === imageId)
    if (!img) return
    const cell = img.cells.find(cl => cl.row === row && cl.col === col)
    if (cell) { cell.owned = !cell.owned; await save(c) }
  }

  async function setCellOwned(collectionId, imageId, row, col) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return
    const img = c.images.find(i => i.id === imageId)
    if (!img) return
    let cell = img.cells.find(cl => cl.row === row && cl.col === col)
    if (cell) {
      if (cell.owned) return
      cell.owned = true
    } else {
      img.cells.push({ row, col, owned: true, ignored: false })
    }
    await save(c)
  }

  async function toggleIgnoreCell(collectionId, imageId, row, col) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return
    const img = c.images.find(i => i.id === imageId)
    if (!img) return
    const cell = img.cells.find(cl => cl.row === row && cl.col === col)
    if (cell) { cell.ignored = !cell.ignored; await save(c) }
  }

  async function saveCollection(collectionId) {
    const c = collections.value.find(c => c.id === collectionId)
    if (c) await save(c)
  }

  async function resizeGrid(collectionId, imageId, newRows, newColsPerRow) {
    const c = collections.value.find(c => c.id === collectionId)
    if (!c) return
    const img = c.images.find(i => i.id === imageId)
    if (!img) return
    const newCells = []
    for (let r = 0; r < newRows; r++) {
      const nc = newColsPerRow ? newColsPerRow[r] : (newColsPerRow || 1)
      for (let co = 0; co < nc; co++) {
        const old = img.cells.find(cl => cl.row === r && cl.col === co)
        newCells.push({ row: r, col: co, owned: old ? old.owned : false, ignored: old ? !!old.ignored : false })
      }
    }
    img.rows = newRows
    img.colsPerRow = newColsPerRow || new Array(newRows).fill(1)
    img.cells = newCells
    await save(c)
  }

  function getUnownedCells(colId) {
    const c = collections.value.find(c => c.id === colId)
    if (!c) return []
    const result = []
    for (const img of c.images) {
      for (const cell of img.cells) {
        if (!cell.owned && !cell.ignored) {
          result.push({ ...cell, imageId: img.id, collectionId: colId, image: img })
        }
      }
    }
    return result
  }

  // ---- Albums ----
  const albums = ref([])
  const albumsLoaded = ref(false)

  async function loadAlbumsData() {
    const data = await loadAlbums()
    albums.value = data
    albumsLoaded.value = true
  }

  async function createAlbum(name) {
    const a = { id: genId(), name, createdAt: Date.now(), images: [] }
    albums.value.push(a)
    await saveAlbum(a)
    return a
  }

  async function deleteAlbum(id) {
    albums.value = albums.value.filter(a => a.id !== id)
    await dbRemoveAlbum(id)
  }

  async function updateAlbumName(id, name) {
    const a = albums.value.find(a => a.id === id)
    if (a) { a.name = name; await saveAlbum(a) }
  }

  function getAlbum(id) {
    return albums.value.find(a => a.id === id)
  }

  async function addAlbumImage(albumId, file, footnote) {
    const a = albums.value.find(a => a.id === albumId)
    if (!a) return
    const img = { id: genId(), data: file, footnote: footnote || '', order: a.images.length }
    a.images.push(img)
    await saveAlbum(a)
    return img
  }

  async function removeAlbumImage(albumId, imageId) {
    const a = albums.value.find(a => a.id === albumId)
    if (!a) return
    a.images = a.images.filter(i => i.id !== imageId)
    await saveAlbum(a)
  }

  async function updateAlbumFootnote(albumId, imageId, footnote) {
    const a = albums.value.find(a => a.id === albumId)
    if (!a) return
    const img = a.images.find(i => i.id === imageId)
    if (img) { img.footnote = footnote; await saveAlbum(a) }
  }

  return {
    collections, loaded,
    load, createCollection, deleteCollection, updateCollectionName,
    getCollection, getCols, totalCards, ownedCards,
    addImage, removeImage, updateCaption,
    toggleCell, setCellOwned, toggleIgnoreCell, saveCollection, resizeGrid, getUnownedCells,
    albums, albumsLoaded, loadAlbumsData, createAlbum, deleteAlbum, updateAlbumName,
    getAlbum, addAlbumImage, removeAlbumImage, updateAlbumFootnote
  }
})
