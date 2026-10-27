import { MANUAL_LIMITS, validateManual, type ManualDocument } from './knowledge';
export type ManualUpdate = (latest: ManualDocument[]) => ManualDocument[];
interface Entry { owner: string; documents: ManualDocument[] }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('o4o-assistant-manuals-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('library', { keyPath: 'owner' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('이 브라우저에서 매뉴얼을 저장할 수 없습니다.'));
  });
}
function validateDocuments(documents: unknown): ManualDocument[] {
  if (!Array.isArray(documents) || documents.length > MANUAL_LIMITS.documents) throw Error('매뉴얼 자료함은 최대 10개까지 지원합니다.');
  return documents.map(validateManual);
}
export async function loadManuals(owner: string): Promise<ManualDocument[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('library').objectStore('library').get(owner);
      request.onsuccess = () => {
        try { const entry = request.result as Entry | undefined; resolve(validateDocuments(entry?.documents ?? [])); }
        catch { reject(Error('저장된 매뉴얼을 읽지 못했습니다. 내보낸 자료나 원본을 다시 가져와 주세요.')); }
      };
      request.onerror = () => reject(Error('매뉴얼 자료함을 읽지 못했습니다.'));
    });
  } finally { db.close(); }
}
/** Read-modify-write in one transaction: an old tab's usage update cannot erase another tab's edits. */
export async function updateManuals(owner: string, update: ManualUpdate): Promise<ManualDocument[]> {
  if (!owner) throw Error('현재 계정을 확인해 주세요.');
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('library', 'readwrite');
      const store = tx.objectStore('library');
      const request = store.get(owner);
      let next: ManualDocument[] = [];
      let failure: Error | null = null;
      request.onsuccess = () => {
        try {
          const entry = request.result as Entry | undefined;
          next = validateDocuments(update(validateDocuments(entry?.documents ?? [])));
          store.put({ owner, documents: next });
        } catch (error) { failure = error instanceof Error ? error : Error('매뉴얼을 갱신하지 못했습니다.'); tx.abort(); }
      };
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(failure ?? Error('매뉴얼 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.'));
      tx.onabort = () => reject(failure ?? Error('매뉴얼 저장이 취소되었습니다.'));
    });
  } finally { db.close(); }
}
