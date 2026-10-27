import { MANUAL_LIMITS, validateManual, type ManualDocument } from './knowledge';
interface Entry { owner: string; documents: ManualDocument[] }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('o4o-assistant-manuals-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('library', { keyPath: 'owner' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('이 브라우저에서 매뉴얼을 저장할 수 없습니다.'));
  });
}
export async function loadManuals(owner: string): Promise<ManualDocument[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('library').objectStore('library').get(owner);
      request.onsuccess = () => {
        try { const entry = request.result as Entry | undefined; resolve((entry?.documents ?? []).map(validateManual)); }
        catch { reject(Error('저장된 매뉴얼을 읽지 못했습니다. 내보낸 자료나 원본을 다시 가져와 주세요.')); }
      };
      request.onerror = () => reject(Error('매뉴얼 자료함을 읽지 못했습니다.'));
    });
  } finally { db.close(); }
}
export async function saveManuals(owner: string, documents: readonly ManualDocument[]): Promise<void> {
  if (!owner || documents.length > MANUAL_LIMITS.documents) throw Error('매뉴얼은 계정당 이 브라우저에 최대 10개까지 저장할 수 있습니다.');
  const clean = documents.map(validateManual);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('library', 'readwrite');
      tx.objectStore('library').put({ owner, documents: clean });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(Error('매뉴얼 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.'));
      tx.onabort = () => reject(Error('매뉴얼 저장이 취소되었습니다.'));
    });
  } finally { db.close(); }
}
