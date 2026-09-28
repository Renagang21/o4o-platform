/**
 * Hospital Pharmacy — 원내 약품 Local Context (무로그인 · 직접 선택한 실제 파일 SSOT)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-DIRECT-FILE-SELECTION-AND-PRODUCTION-CLOSURE §2·§6·§7·§11
 *
 * 연결·재접속·권한·변경 감지 규칙은 lib/drugFileSession 이 소유한다. 이 컨텍스트는 브라우저 의존을
 * 주입하고 화면 복귀(focus/visibility) 이벤트를 전달할 뿐이다.
 * 정규화된 행은 메모리에만 있다 — localStorage/IndexedDB 에 데이터셋을 복제하지 않는다.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { HospitalDrugRecord } from '@o4o/hospital-pharmacy-core';
import { detectBrowserSupport } from '../lib/browserSupport';
import { clearLegacyFolderHandle, loadDrugFile, saveDrugFile } from '../lib/drugFileStore';
import { pickDrugFile, queryReadPermission, readDrugFile, requestReadPermission } from '../lib/localDrugFile';
import { DrugFileSession, type DrugFileSessionState } from '../lib/drugFileSession';

export type { LocalDrugStatus } from '../lib/drugFileSession';

interface LocalDrugContextValue extends DrugFileSessionState {
  /** 최초 연결 / [파일 변경] — 사용자가 파일 하나를 직접 고른다(사용자 클릭 안에서). */
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
  const [state, setState] = useState<DrugFileSessionState>({ status: 'checking', fileName: null, file: null, error: null });
  const sessionRef = useRef<DrugFileSession | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = new DrugFileSession(
      {
        supportsFilePicker: () => detectBrowserSupport().hasFileSystemAccess,
        pickFile: pickDrugFile,
        loadStored: loadDrugFile,
        saveStored: saveDrugFile,
        clearLegacyFolder: clearLegacyFolderHandle,
        queryPermission: queryReadPermission,
        requestPermission: requestReadPermission,
        getFile: (h) => h.getFile(),
        readDrugFile: (f) => readDrugFile(f),
      },
      setState,
    );
  }
  const session = sessionRef.current;

  useEffect(() => {
    void session.init();
  }, [session]);

  // 화면 복귀 시 변경 감지(같은 파일 덮어쓰기 → 자동 반영 §7).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') session.onVisible();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session]);

  const connect = useCallback(() => session.connect(), [session]);
  const allowAccess = useCallback(() => session.allowAccess(), [session]);
  const ensureFresh = useCallback(() => session.ensureFresh(), [session]);
  const reload = useCallback(() => session.reload(), [session]);

  return (
    <LocalDrugContext.Provider value={{ ...state, connect, allowAccess, ensureFresh, reload }}>
      {children}
    </LocalDrugContext.Provider>
  );
}

export function useLocalDrugs(): LocalDrugContextValue {
  const ctx = useContext(LocalDrugContext);
  if (!ctx) throw new Error('useLocalDrugs must be used within LocalDrugProvider');
  return ctx;
}
