import type { AltarRecord } from './types'

const DB_NAME = 'veladora'
const STORE = 'altars'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function listAltars(): Promise<AltarRecord[]> {
  const db = await openDb()
  const records = await requestToPromise(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())
  db.close()
  return (records as AltarRecord[]).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveAltar(record: AltarRecord): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record))
  db.close()
}

export async function deleteAltar(id: string): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id))
  db.close()
}
