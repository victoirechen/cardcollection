const DB_NAME = 'cardcollection'
const DB_VERSION = 2

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('albums')) {
        db.createObjectStore('albums', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx(storeName, mode) {
  return openDB().then(db => {
    const tx = db.transaction(storeName, mode)
    return { tx, store: tx.objectStore(storeName) }
  })
}

export async function loadAll() {
  const { store } = await tx('collections', 'readonly')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function save(collection) {
  const { store } = await tx('collections', 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.put(collection)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function remove(id) {
  const { store } = await tx('collections', 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function loadAlbums() {
  const { store } = await tx('albums', 'readonly')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function saveAlbum(album) {
  const { store } = await tx('albums', 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.put(album)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function removeAlbum(id) {
  const { store } = await tx('albums', 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
