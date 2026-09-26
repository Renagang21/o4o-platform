/**
 * Hospital Pharmacy — 원내 약품 Local Context (무로그인 · 실제 파일 SSOT)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION §3·§4·§5·§8·§15
 *
 *   최초 1회: [원내 약품 폴더 연결] → 폴더 선택 → hospital-drugs.xlsx 존재 확인 → 연결 완료(handle 을 IndexedDB 에 저장).
 *   이후:     저장된 handle 로 실제 파일을 다시 읽는다. 파일을 매번 고르지 않는다.
 *             브라우저가 권한을 다시 물으면(재접속 직후) "허용" 한 번만 누르면 된다 — 폴더 재선택 아님.
 *   변경 감지: 화면 복귀(focus/visibility) · 조회 직전에 lastModified/size 를 보고 바뀌었으면 다시 읽는다.
 *
 * 정규화된 행은 이 컨텍스트의 메모리에만 있다 — localStorage/IndexedDB 에 데이터셋을 복제하지 않는다(§4·§8).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { HospitalDrugRecord } from '@o4o/hospital-pharmacy-core';
import { detectBrowserSupport } from '../lib/browserSupport';
import { loadFolderHandle, saveFolderHandle } from '../lib/folderStore';
import {
  DrugFileError,
  HOSPITAL_DRUG_FILE_NAME,
  openDrugFile,
  pickDrugFolder,
  queryReadPermission,
  readDrugFile,
  requestReadPermission,
  type LoadedDrugFile,
} from '../lib/localDrugFile';

export type LocalDrugStatus =
  | 'checking'
  | 'unsupported' // File System Access 없음 — Chrome/Edge 필요
  | 'unconnected' // 폴더 미연결(최초)
  | 'needs-permission' // 연결됐지만 이번 접속에서 읽기 허용 필요(클릭 1회)
  | 'file-missing' // 폴더에 hospital-drugs.xlsx 없음
  | 'loading'
  | 'ready'
  | 'error';

interface LocalDrugContextValue {
  status: LocalDrugStatus;
  folderName: string | null;
  file: LoadedDrugFile | null;
  error: string | null;
  /** 최초 연결 / 다른 폴더로 다시 연결(사용자 클릭 안에서). */
  connect: () => Promise<void>;
  /** 이번 접속에서 읽기 허용(사용자 클릭 안에서). */
  allowAccess: () => Promise<void>;
  /** 파일이 바뀌었으면 다시 읽고 현재 행을 돌려준다(조회 직전 호출). */
  ensureFresh: () => Promise<HospitalDrugRecord[] | null>;
  /** 강제로 다시 읽기(mapping 은 fingerprint 가 같으면 재사용). */
  reload: () => Promise<void>;
}

const LocalDrugContext = createContext<LocalDrugContextValue | null>(null);

export function LocalDrugProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocalDrugStatus>('checking');
  const [folderName, setFolderName] = useState<string | null>(null);
  const [file, setFile] = useState<LoadedDrugFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const folderRef = useRef<FileSystemDirectoryHandle | null>(null);
  const fileRef = useRef<LoadedDrugFile | null>(null);
  const inflight = useRef<Promise<HospitalDrugRecord[] | null> | null>(null);

  /** 실제 파일을 열고, 바뀌었으면(또는 force) 다시 파싱한다. 동시 호출은 하나로 합친다. */
  const readFromFolder = useCallback((force: boolean): Promise<HospitalDrugRecord[] | null> => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      const folder = folderRef.current;
      if (!folder) return null;
      if ((await queryReadPermission(folder)) !== 'granted') {
        setStatus('needs-permission');
        return fileRef.current?.rows ?? null;
      }
      const f = await openDrugFile(folder);
      if (!f) {
        fileRef.current = null;
        setFile(null);
        setStatus('file-missing');
        return null;
      }
      const prev = fileRef.current;
      if (!force && prev && prev.lastModified === f.lastModified && prev.size === f.size) {
        return prev.rows; // 변경 없음 — 메모리 Context 그대로
      }
      if (!prev) setStatus('loading');
      try {
        const loaded = await readDrugFile(f);
        fileRef.current = loaded;
        setFile(loaded);
        setError(null);
        setStatus('ready');
        return loaded.rows;
      } catch (e) {
        setError(e instanceof DrugFileError || e instanceof Error ? e.message : '원내 약품 파일을 읽지 못했습니다.');
        if (!prev) setStatus('error');
        return prev?.rows ?? null;
      }
    })().finally(() => { inflight.current = null; });
    inflight.current = run;
    return run;
  }, []);

  // 최초 진입 — 저장된 폴더가 있으면 권한 확인 후 바로 읽는다.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!detectBrowserSupport().hasFileSystemAccess) {
        setStatus('unsupported');
        return;
      }
      const handle = await loadFolderHandle();
      if (cancelled) return;
      if (!handle) {
        setStatus('unconnected');
        return;
      }
      folderRef.current = handle;
      setFolderName(handle.name);
      const perm = await queryReadPermission(handle);
      if (cancelled) return;
      if (perm === 'granted') await readFromFolder(true);
      else setStatus('needs-permission');
    })();
    return () => { cancelled = true; };
  }, [readFromFolder]);

  // 화면 복귀 시 변경 감지(같은 이름 덮어쓰기 → 자동 반영 §5·§15).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && folderRef.current && (fileRef.current || status === 'file-missing' || status === 'error')) {
        void readFromFolder(false);
      }
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [readFromFolder, status]);

  const connect = useCallback(async () => {
    setError(null);
    const handle = await pickDrugFolder();
    if (!handle) return; // 취소
    const f = await openDrugFile(handle);
    if (!f) {
      setError(`선택한 폴더에 ${HOSPITAL_DRUG_FILE_NAME} 파일이 없습니다. 파일이 있는 폴더를 선택해 주세요.`);
      return;
    }
    folderRef.current = handle;
    fileRef.current = null;
    setFolderName(handle.name);
    await saveFolderHandle(handle);
    await readFromFolder(true);
  }, [readFromFolder]);

  const allowAccess = useCallback(async () => {
    const handle = folderRef.current;
    if (!handle) return;
    const perm = await requestReadPermission(handle);
    if (perm === 'granted') await readFromFolder(true);
    else setError('원내 약품 폴더 읽기가 허용되지 않았습니다. 다시 눌러 허용해 주세요.');
  }, [readFromFolder]);

  const ensureFresh = useCallback(() => readFromFolder(false), [readFromFolder]);
  const reload = useCallback(async () => { await readFromFolder(true); }, [readFromFolder]);

  return (
    <LocalDrugContext.Provider value={{ status, folderName, file, error, connect, allowAccess, ensureFresh, reload }}>
      {children}
    </LocalDrugContext.Provider>
  );
}

export function useLocalDrugs(): LocalDrugContextValue {
  const ctx = useContext(LocalDrugContext);
  if (!ctx) throw new Error('useLocalDrugs must be used within LocalDrugProvider');
  return ctx;
}
