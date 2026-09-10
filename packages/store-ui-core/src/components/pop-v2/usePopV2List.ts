/**
 * POP 관리 목록 상태 — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 기존 POP 에는 목록 자체가 없었다("만들면 끝"). 그것이 재편집·복제·보관이
 * 불가능했던 구조적 원인이다. 이 훅이 POP 을 관리 대상 문서로 만든다.
 */

import { useCallback, useEffect, useState } from 'react';
import type { PopV2Api, PopV2Document, PopV2Notify, PopV2Status } from './types';

export interface UsePopV2ListOptions {
  api: PopV2Api;
  notify: PopV2Notify;
}

export interface PopV2ListState {
  documents: PopV2Document[];
  loading: boolean;
  error: string | null;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  reload: () => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  setArchived: (id: string, archived: boolean) => Promise<void>;
}

export function usePopV2List({ api, notify }: UsePopV2ListOptions): PopV2ListState {
  const [documents, setDocuments] = useState<PopV2Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(
    async (status: PopV2Status | 'all' | undefined) => {
      setLoading(true);
      setError(null);
      try {
        setDocuments(await api.list(status));
      } catch (e) {
        // 조회 실패를 빈 목록으로 삼키지 않는다 — 실패는 실패로 보여준다.
        setDocuments([]);
        setError(e instanceof Error ? e.message : 'POP 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  const reload = useCallback(
    () => load(showArchived ? 'archived' : undefined),
    [load, showArchived],
  );

  useEffect(() => {
    void load(showArchived ? 'archived' : undefined);
  }, [load, showArchived]);

  const duplicate = useCallback(
    async (id: string) => {
      try {
        await api.duplicate(id);
        notify.success('POP 을 복제했습니다.');
        await reload();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : 'POP 복제에 실패했습니다.');
      }
    },
    [api, notify, reload],
  );

  const setArchived = useCallback(
    async (id: string, archived: boolean) => {
      try {
        await api.setArchived(id, archived);
        notify.success(archived ? 'POP 을 보관했습니다.' : 'POP 을 복원했습니다.');
        await reload();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : '상태를 변경하지 못했습니다.');
      }
    },
    [api, notify, reload],
  );

  return {
    documents,
    loading,
    error,
    showArchived,
    setShowArchived,
    reload,
    duplicate,
    setArchived,
  };
}
