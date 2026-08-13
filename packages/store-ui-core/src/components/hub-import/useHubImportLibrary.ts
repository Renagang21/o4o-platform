/**
 * useHubImportLibrary — 매장 HUB 콘텐츠 탐색 + "매장으로 가져오기" 상태 Core (headless)
 *
 * WO-O4O-STORE-HUB-SUPPLIER-CONTENT-EXPLORER-COMMONIZATION-V1
 *
 * KPA-Society / K-Cosmetics 의 매장 HUB 진열 화면(블로그 · POP · QR)이 동일하게 갖고 있던
 * 상태 기계만 담는다.
 *   목록 조회 · 페이지네이션 · loading/error · 매장 slug 확인 ·
 *   선택(Set) · 단건 가져오기 · 일괄 가져오기(fan-out) · 배치 결과
 *
 * 담지 않는 것:
 *   - 화면(컬럼 · 카드 · 안내문 · accent) — 서비스 페이지가 그대로 소유한다.
 *   - **가져오기 API 자체** — `importOne` adapter 로 주입한다. write 정책을 Core 에 넣지 않는다.
 *   - 중복 가져오기 정책 — 각 서비스의 현재 정책(무제한 재가져오기)을 그대로 둔다.
 *     Core 는 "이미 가져왔는지"를 판단하지 않는다.
 *
 * 원본/사본 경계 (변경 없음):
 *   HUB 목록은 운영자·공급자 **원본**의 읽기 전용 진열이고, importOne 이 만드는 것은
 *   매장 소유 **사본**이다. Core 는 원본을 write 하지 않으며 사본과 원본을 동기화하지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@o4o/error-handling';
import { useBatchAction } from '@o4o/operator-ux-core';
import { useSupplyProductList } from '../supply-catalog/useSupplyProductList';

/** HUB 진열 항목의 최소 계약 — 서비스별 응답 타입은 이 위에서 자유롭게 확장한다. */
export interface HubImportLibraryItem {
  id: string;
}

export interface HubImportLibraryMessages<T> {
  /** 목록 조회 실패 (예: 'HUB 블로그를 불러올 수 없습니다') */
  loadError: string;
  /** 매장 미연결 상태에서 가져오기를 시도할 때 (예: '매장 정보를 확인할 수 없습니다') */
  storeMissing: string;
  /** 일괄 가져오기 결과 행에 기록할 매장 미연결 사유 (예: '매장 정보 미연결') */
  storeMissingBatchError: string;
  /** 단건 성공 문구 — importOne 의 반환값과 원본 항목을 받는다. */
  importSuccess: (result: unknown, item: T) => string;
  /** 단건 실패 기본 문구 (예: '가져오기에 실패했습니다') */
  importError: string;
  /** 일괄 성공 문구 (예: n => `${n}개 블로그가 내 매장에 추가되었습니다`) */
  bulkSuccess: (count: number) => string;
  /** 일괄 실패 문구 */
  bulkError: (count: number) => string;
}

export interface UseHubImportLibraryOptions<T extends HubImportLibraryItem> {
  /** HUB 목록 조회 adapter (서비스별 hubContentApi 호출). */
  fetchPage: (query: { page: number; limit: number }) => Promise<{ items: T[]; total: number }>;
  /** 매장 slug 확인 adapter. 실패 시 null 로 처리한다. */
  resolveStoreSlug: () => Promise<string | null>;
  /** 매장 사본 생성 adapter (단건). 일괄은 이 함수의 fan-out 으로 처리한다. */
  importOne: (slug: string, id: string) => Promise<unknown>;
  messages: HubImportLibraryMessages<T>;
  limit?: number;
}

export interface UseHubImportLibraryResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  setPage: (page: number) => void;

  /** 매장 slug — null 이면 매장 미연결(가져오기 불가) */
  slug: string | null;
  /** slug 확인이 끝났는지 (확인 전에는 미연결 안내를 띄우지 않는다) */
  slugResolved: boolean;

  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  clearSelection: () => void;

  selectedItem: T | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<T | null>>;

  singleImporting: boolean;
  importSingle: (item: T) => Promise<void>;

  /** 일괄 가져오기 실행 (선택 0건이면 no-op) */
  importSelected: () => Promise<void>;
  /** useBatchAction 결과 — BulkResultModal 에 그대로 전달한다. */
  batch: ReturnType<typeof useBatchAction>;
}

export function useHubImportLibrary<T extends HubImportLibraryItem>(
  options: UseHubImportLibraryOptions<T>,
): UseHubImportLibraryResult<T> {
  const { fetchPage, resolveStoreSlug, importOne, messages, limit = 20 } = options;

  const [slug, setSlug] = useState<string | null>(null);
  const [slugResolved, setSlugResolved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [singleImporting, setSingleImporting] = useState(false);

  const batch = useBatchAction();

  // 목록 상태는 기존 공통 Core 를 그대로 재사용한다 (조회/페이지/로딩/에러).
  const list = useSupplyProductList<T>({
    fetchPage: useCallback(
      ({ page, limit: pageLimit }: { page: number; limit: number }) =>
        fetchPage({ page, limit: pageLimit }),
      // fetchPage 는 소비처에서 useCallback 으로 고정한다.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [fetchPage],
    ),
    limit,
    resolveErrorMessage: (err) => (err as { message?: string })?.message || messages.loadError,
    // 페이지 이동 시 선택 초기화 (기존 화면 동작과 동일).
    onBeforeLoad: () => setSelectedIds(new Set()),
  });

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const resolved = await resolveStoreSlug();
        if (!canceled) {
          setSlug(resolved);
          setSlugResolved(true);
        }
      } catch {
        if (!canceled) {
          setSlug(null);
          setSlugResolved(true);
        }
      }
    })();
    return () => {
      canceled = true;
    };
    // 마운트 1회 — adapter identity 변화로 재확인하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const importSingle = useCallback(
    async (item: T) => {
      if (!slug) {
        toast.error(messages.storeMissing);
        return;
      }
      setSingleImporting(true);
      try {
        const result = await importOne(slug, item.id);
        toast.success(messages.importSuccess(result, item));
        setSelectedItem(null);
      } catch (e) {
        toast.error((e as { message?: string })?.message || messages.importError);
      } finally {
        setSingleImporting(false);
      }
    },
    [slug, importOne, messages],
  );

  // 일괄 = 단건 endpoint fan-out (신규 backend 없음 — 기존 화면 동작 유지).
  const batchImportItems = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      if (!slug) {
        return {
          data: {
            results: ids.map((id) => ({
              id,
              status: 'failed' as const,
              error: messages.storeMissingBatchError,
            })),
          },
        };
      }
      const settled = await Promise.allSettled(ids.map((id) => importOne(slug, id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      const successCount = results.filter((r) => r.status === 'success').length;
      const failCount = results.filter((r) => r.status === 'failed').length;
      if (successCount > 0) toast.success(messages.bulkSuccess(successCount));
      if (failCount > 0) toast.error(messages.bulkError(failCount));
      return { data: { results } };
    },
    [slug, importOne, messages],
  );

  const importSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!slug) {
      toast.error(messages.storeMissing);
      return;
    }
    const result = await batch.executeBatch(batchImportItems, Array.from(selectedIds));
    if (result.successCount > 0) setSelectedIds(new Set());
  }, [selectedIds, slug, batch, batchImportItems, messages]);

  return {
    items: list.items,
    total: list.total,
    page: list.page,
    totalPages: list.totalPages,
    isLoading: list.loading,
    error: list.error,
    reload: list.reload,
    setPage: list.setPage,

    slug,
    slugResolved,

    selectedIds,
    setSelectedIds,
    clearSelection,

    selectedItem,
    setSelectedItem,

    singleImporting,
    importSingle,

    importSelected,
    batch,
  };
}
