/**
 * useSignageLibrary — Store HUB 사이니지 라이브러리 상태 Core (headless)
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * KPA-Society(652L) · K-Cosmetics(579L) · GlycoPharm(580L) 이 각자 갖고 있던 동일 상태 기계를
 * 하나로 모은다. 세 화면의 상태 흐름은 문구·accent 와 copy adapter 를 빼면 동일했다.
 *
 * 담는 것:
 *   미디어/플레이리스트 2탭 · producer 필터(client-side) · 탭별 페이지네이션 ·
 *   loading/error · 선택(Set) · 상세 drawer 대상 · 단건 복사 · 일괄 복사(fan-out) ·
 *   가져오기 직후 안내 상태
 *
 * 담지 않는 것:
 *   - 화면(컬럼·배지·안내문·accent) → SignageLibraryView
 *   - **복사 API 자체** → `copyOne` adapter 로 주입한다. 서비스마다 endpoint 와
 *     sourceService 파라미터 유무가 다르므로 Core 가 write 계약을 소유하지 않는다.
 *   - 원본/사본 경계 판단. HUB 목록은 원본의 읽기 전용 진열이고 copyOne 이 만드는 것은
 *     매장 소유 사본이다. Core 는 둘을 동기화하지 않는다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@o4o/error-handling';
import { useBatchAction } from '@o4o/operator-ux-core';

/** 사이니지 진열 항목의 최소 계약 (서비스 응답 타입이 이 위를 확장한다). */
export interface SignageLibraryItem {
  id: string;
  title: string;
  createdAt: string | Date;
  description?: string | null;
  producer?: string | null;
  mediaType?: string | null;
  duration?: number | null;
  totalDuration?: number | null;
  itemCount?: number | null;
  creatorName?: string | null;
  sourceUrl?: string | null;
}

export type SignageViewTab = 'media' | 'playlist';

export interface SignageLibraryMessages<T> {
  /** 미디어 목록 조회 실패 */
  mediaLoadError: string;
  /** 플레이리스트 목록 조회 실패 */
  playlistLoadError: string;
  /** 단건 복사 성공 */
  copySuccess: (item: T) => string;
  /** 이미 추가된 항목 (DUPLICATE_SNAPSHOT 분기) */
  copyDuplicate: string;
  /** 403 */
  copyForbidden: string;
  /** 그 외 실패 */
  copyFailed: (reason: string) => string;
  /** 일괄 성공 */
  bulkSuccess: (count: number) => string;
  /** 일괄 실패 */
  bulkFailed: (count: number) => string;
}

export interface UseSignageLibraryOptions<T extends SignageLibraryItem> {
  /** 미디어 목록 조회 adapter */
  fetchMedia: (query: { page: number; limit: number }) => Promise<{ items: T[]; total: number }>;
  /** 플레이리스트 목록 조회 adapter */
  fetchPlaylists: (query: { page: number; limit: number }) => Promise<{ items: T[]; total: number }>;
  /**
   * 매장 사본 생성 adapter (단건). 일괄은 이 함수의 fan-out 이다.
   * 반환값의 title 은 "가져온 사본 확인" 안내에 쓰인다(없으면 원본 title 사용).
   */
  copyOne: (item: T) => Promise<{ title?: string } | void>;
  messages: SignageLibraryMessages<T>;
  limit?: number;
}

export interface SignageImportedNotice {
  count: number;
  title?: string;
}

export interface UseSignageLibraryResult<T> {
  viewTab: SignageViewTab;
  setViewTab: (tab: SignageViewTab) => void;
  sourceFilter: string;
  setSourceFilter: (key: string) => void;

  /** 현재 탭의 (producer 필터 적용) 데이터 */
  items: T[];
  /** 탭 배지 숫자 */
  mediaCount: number;
  playlistCount: number;

  isLoading: boolean;
  error: string | null;
  reload: () => void;

  page: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  /** producer 필터가 client-side 라 서버 페이지 이동을 노출하면 안 되는 상태를 반영한다. */
  paginationVisible: boolean;

  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  clearSelection: () => void;

  selectedItem: T | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<T | null>>;

  copySingle: (item: T) => Promise<void>;
  copySelected: () => Promise<void>;
  batch: ReturnType<typeof useBatchAction>;

  /** 가져오기 직후 안내(사본 확인 경로). 노출 여부는 View config 가 결정한다. */
  imported: SignageImportedNotice | null;
  dismissImported: () => void;
}

export function useSignageLibrary<T extends SignageLibraryItem>(
  options: UseSignageLibraryOptions<T>,
): UseSignageLibraryResult<T> {
  const { fetchMedia, fetchPlaylists, copyOne, messages, limit = 20 } = options;

  const [viewTab, setViewTab] = useState<SignageViewTab>('media');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [allMedia, setAllMedia] = useState<T[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaLoading, setMediaLoading] = useState(true);

  const [allPlaylists, setAllPlaylists] = useState<T[]>([]);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistLoading, setPlaylistLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [imported, setImported] = useState<SignageImportedNotice | null>(null);

  const batch = useBatchAction();

  const loadMedia = useCallback(
    async (page: number) => {
      setMediaLoading(true);
      setError(null);
      try {
        const res = await fetchMedia({ page, limit });
        setAllMedia(res.items);
        setMediaTotal(res.total);
      } catch {
        setAllMedia([]);
        setMediaTotal(0);
        setError(messages.mediaLoadError);
      } finally {
        setMediaLoading(false);
      }
    },
    // adapter/messages 는 소비처에서 고정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchMedia, limit],
  );

  const loadPlaylists = useCallback(
    async (page: number) => {
      setPlaylistLoading(true);
      setError(null);
      try {
        const res = await fetchPlaylists({ page, limit });
        setAllPlaylists(res.items);
        setPlaylistTotal(res.total);
      } catch {
        setAllPlaylists([]);
        setPlaylistTotal(0);
        setError(messages.playlistLoadError);
      } finally {
        setPlaylistLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchPlaylists, limit],
  );

  useEffect(() => {
    void loadMedia(mediaPage);
  }, [loadMedia, mediaPage]);
  useEffect(() => {
    void loadPlaylists(playlistPage);
  }, [loadPlaylists, playlistPage]);

  // 탭/필터 전환 시 선택과 가져오기 안내를 함께 해제한다.
  // (안내의 링크 대상은 viewTab 파생이라 탭을 바꾼 뒤 남으면 잘못된 자료함을 가리킨다.)
  useEffect(() => {
    setSelectedIds(new Set());
    setImported(null);
  }, [viewTab, sourceFilter]);

  const filteredMedia = useMemo(
    () => (sourceFilter === 'all' ? allMedia : allMedia.filter((m) => m.producer === sourceFilter)),
    [allMedia, sourceFilter],
  );
  const filteredPlaylists = useMemo(
    () =>
      sourceFilter === 'all'
        ? allPlaylists
        : allPlaylists.filter((p) => p.producer === sourceFilter),
    [allPlaylists, sourceFilter],
  );

  const isMedia = viewTab === 'media';
  const items = isMedia ? filteredMedia : filteredPlaylists;

  const copySingle = useCallback(
    async (item: T) => {
      try {
        const res = await copyOne(item);
        toast.success(messages.copySuccess(item));
        setSelectedItem(null);
        setImported({
          count: 1,
          title: (res as { title?: string } | undefined)?.title || item.title,
        });
      } catch (e) {
        const err = e as { message?: string; code?: string; status?: number };
        const msg = err?.message || '';
        if (
          msg.includes('DUPLICATE') ||
          msg.includes('already') ||
          err?.code === 'DUPLICATE_SNAPSHOT'
        ) {
          toast.error(messages.copyDuplicate);
        } else if (err?.status === 403) {
          toast.error(messages.copyForbidden);
        } else {
          toast.error(messages.copyFailed(msg || '서버 오류'));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [copyOne],
  );

  const batchCopy = useCallback(
    async (
      ids: string[],
    ): Promise<{
      data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> };
    }> => {
      const pool = isMedia ? filteredMedia : filteredPlaylists;
      const byId = new Map(pool.map((it) => [it.id, it]));
      const settled = await Promise.allSettled(
        ids.map((id) => {
          const item = byId.get(id);
          if (!item) return Promise.reject(new Error('항목을 찾을 수 없습니다.'));
          return copyOne(item);
        }),
      );
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      const successCount = results.filter((r) => r.status === 'success').length;
      const failCount = results.length - successCount;
      if (successCount > 0) toast.success(messages.bulkSuccess(successCount));
      if (failCount > 0) toast.error(messages.bulkFailed(failCount));
      return { data: { results } };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMedia, filteredMedia, filteredPlaylists, copyOne],
  );

  const copySelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const result = await batch.executeBatch(batchCopy, Array.from(selectedIds));
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      setImported({ count: result.successCount });
    }
  }, [selectedIds, batch, batchCopy]);

  const rawTotal = isMedia ? mediaTotal : playlistTotal;
  const totalPages = Math.max(1, Math.ceil(rawTotal / limit));

  return {
    viewTab,
    setViewTab,
    sourceFilter,
    setSourceFilter,

    items,
    mediaCount: sourceFilter === 'all' ? mediaTotal : filteredMedia.length,
    playlistCount: sourceFilter === 'all' ? playlistTotal : filteredPlaylists.length,

    isLoading: isMedia ? mediaLoading : playlistLoading,
    error,
    reload: () => {
      if (isMedia) void loadMedia(mediaPage);
      else void loadPlaylists(playlistPage);
    },

    page: isMedia ? mediaPage : playlistPage,
    totalPages,
    total: rawTotal,
    setPage: (p: number) => {
      if (isMedia) setMediaPage(p);
      else setPlaylistPage(p);
    },
    paginationVisible: totalPages > 1 && sourceFilter === 'all',

    selectedIds,
    setSelectedIds,
    clearSelection: () => setSelectedIds(new Set()),

    selectedItem,
    setSelectedItem,

    copySingle,
    copySelected,
    batch,

    imported,
    dismissImported: () => setImported(null),
  };
}
