/**
 * 원내 약품 폴더 연결 저장소 — IndexedDB (§4)
 *
 * 저장하는 것: 폴더 directory handle · 구조 fingerprint 별 GFU mapping(inference) · 최소 metadata.
 * 저장하지 않는 것: **원내 약품 데이터 자체**. 정본은 PC 의 실제 hospital-drugs.xlsx 이고,
 * 정규화된 행은 브라우저 메모리(Local Context)에만 둔다(§8). localStorage 도 쓰지 않는다.
 *
 * directory handle 은 structured clone 가능 객체라 IndexedDB 에만 넣을 수 있다(localStorage 불가).
 * private/차단 환경에서 IndexedDB 가 실패할 수 있으므로 모든 호출을 try/catch 로 감싸 null 로 보수 처리한다.
 */
import type { FileStructureInference } from '@o4o/file-understanding-core';

const DB_NAME = 'o4o-hospital-pharmacy';
const DB_VERSION = 1;
const STORE = 'kv';

const KEY_FOLDER = 'drug-folder';
const KEY_MAPPING = 'drug-mapping';

/** 구조 fingerprint 별 GFU 매핑 캐시 — 같은 구조면 AI 를 다시 부르지 않는다(§15). */
export interface StoredMapping {
  fingerprint: string;
  targetSchemaId: string;
  inference: FileStructureInference;
  model: string;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      r.onsuccess = () => resolve((r.result as T | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return false;
  }
}

async function kvDelete(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 무시 — 이미 없거나 접근 차단
  }
}

export const loadFolderHandle = () => kvGet<FileSystemDirectoryHandle>(KEY_FOLDER);
export const saveFolderHandle = (handle: FileSystemDirectoryHandle) => kvSet(KEY_FOLDER, handle);
export const clearFolderHandle = () => kvDelete(KEY_FOLDER);

export const loadMapping = () => kvGet<StoredMapping>(KEY_MAPPING);
export const saveMapping = (mapping: StoredMapping) => kvSet(KEY_MAPPING, mapping);
