import { toRaw } from 'vue'

const DB_NAME = 'cardcollection'
const DB_VERSION = 2
let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('collections'))
        db.createObjectStore('collections', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('albums'))
        db.createObjectStore('albums', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { dbPromise = null; reject(request.error) }
    request.onblocked = () => { dbPromise = null; reject(new Error('indexedDB blocked')) }
  })
  return dbPromise
}

async function loadStore(storeName) {
  const db = await openDB()
  return db.transaction(storeName, 'readonly').objectStore(storeName)
}

async function writeStore(storeName) {
  const db = await openDB()
  return db.transaction(storeName, 'readwrite').objectStore(storeName)
}

function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadAll() {
  const store = await loadStore('collections')
  return (await req(store.getAll())) || []
}

export async function save(collection) {
  const store = await writeStore('collections')
  await req(store.put(toRaw(collection)))
}

export async function remove(id) {
  const store = await writeStore('collections')
  await req(store.delete(id))
}

export async function loadAlbums() {
  const store = await loadStore('albums')
  return (await req(store.getAll())) || []
}

export async function saveAlbum(album) {
  const store = await writeStore('albums')
  await req(store.put(toRaw(album)))
}

export async function removeAlbum(id) {
  const store = await writeStore('albums')
  await req(store.delete(id))
}
