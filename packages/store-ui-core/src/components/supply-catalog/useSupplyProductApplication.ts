/**
 * useSupplyProductApplication — 공급 상품 신청/제외 상태 Core (headless)
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1
 *
 * KPA-Society `HubB2BCatalogPage` 와 공통 `SupplyCatalogHub`(K-Cosmetics · GlycoPharm) 가
 * 각자 갖고 있던 신청 액션 상태 기계를 하나로 모은다.
 *   단건 신청 · 단건 제외 · 선택 일괄 신청(단건 API fan-out) ·
 *   진행 중 id · DUPLICATE_APPLICATION 처리 · 성공 항목 로컬 반영(isAdded)
 *
 * 업무 경계 (변경 없음 — 공통화가 의미를 바꾸지 않는다):
 *   - "내 매장에 추가" = **공급 상품 신청**(ProductApproval PENDING) 이다.
 *     신청 ≠ 장바구니 ≠ 주문이며, 승인 후 생성되는 주문 가능 상품(OrganizationProductListing)과도 다르다.
 *   - 승인 여부·OPL 생성은 backend 정책이다. 이 Core 는 신청 요청만 보내고 목록의 `isAdded`
 *     표시만 낙관적으로 갱신한다(권위 판정 아님 — 재조회 시 backend 값으로 대체된다).
 *   - 제외(`cancelProductByOfferId`)는 매장 취급 목록에서 빼는 동작이며 StoreLocalProduct 와 무관하다.
 *
 * 담지 않는 것: 화면(버튼 · 모달 · 확인 UX). 제외 확인 방식이 서비스마다 다르므로
 *   (KPA = 커스텀 다이얼로그, 공통 Hub = window.confirm) 확인은 호출부가 먼저 수행한다.
 */

import { useCallback, useState } from 'react';
import { toast } from '@o4o/error-handling';

/** 카탈로그 행의 최소 계약. */
export interface SupplyApplicationItem {
  id: string;
  name: string;
  isAdded?: boolean;
}

export interface SupplyProductApplicationApi {
  applyBySupplyProductId(productId: string): Promise<unknown>;
  cancelProductByOfferId(productId: string): Promise<unknown>;
}

export interface SupplyProductApplicationLabels {
  /** 예: '내 매장' · '내 약국'. 토스트 문구에 사용. */
  storeNoun?: string;
}

export interface UseSupplyProductApplicationOptions<T extends SupplyApplicationItem> {
  api: SupplyProductApplicationApi;
  /** 목록 상태 setter (useSupplyProductList 의 setItems 등) — 성공 시 isAdded 반영. */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  labels?: SupplyProductApplicationLabels;
}

export interface UseSupplyProductApplicationResult<T extends SupplyApplicationItem> {
  /** 신청 진행 중인 항목 id (없으면 null) */
  applyingId: string | null;
  /** 제외 진행 중인 항목 id (없으면 null) */
  removingId: string | null;
  bulkAdding: boolean;

  apply: (item: T) => Promise<void>;
  /** 확인 UX 는 호출부가 먼저 처리한다. */
  remove: (item: T) => Promise<void>;
  /** 선택 항목 중 미추가분만 신청한다. 이미 전부 추가됐으면 그에 맞는 안내를 띄운다. */
  bulkApply: (targets: T[], options?: { allAlreadyAdded?: boolean }) => Promise<{ successCount: number; failCount: number }>;
}

const errorCode = (e: unknown): string | undefined =>
  (e as { response?: { data?: { error?: { code?: string } } }; code?: string })?.response?.data?.error?.code ||
  (e as { code?: string })?.code;

const errorMessage = (e: unknown, fallback: string) =>
  (e as { message?: string })?.message || fallback;

export function useSupplyProductApplication<T extends SupplyApplicationItem>(
  options: UseSupplyProductApplicationOptions<T>,
): UseSupplyProductApplicationResult<T> {
  const { api, setItems, labels } = options;
  const storeNoun = labels?.storeNoun ?? '내 매장';

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);

  const markAdded = useCallback(
    (ids: Set<string>, isAdded: boolean) => {
      setItems((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, isAdded } : p)));
    },
    [setItems],
  );

  const apply = useCallback(
    async (item: T) => {
      if (applyingId) return;
      setApplyingId(item.id);
      try {
        await api.applyBySupplyProductId(item.id);
        toast.success(`"${item.name}" ${storeNoun}에 추가되었습니다.`);
        markAdded(new Set([item.id]), true);
      } catch (e) {
        if (errorCode(e) === 'DUPLICATE_APPLICATION') {
          toast.error(`이미 ${storeNoun}에 추가된 상품입니다.`);
        } else {
          toast.error(errorMessage(e, '상품 추가에 실패했습니다.'));
        }
      } finally {
        setApplyingId(null);
      }
    },
    [api, applyingId, markAdded, storeNoun],
  );

  const remove = useCallback(
    async (item: T) => {
      if (removingId) return;
      setRemovingId(item.id);
      try {
        await api.cancelProductByOfferId(item.id);
        toast.success(`"${item.name}"을(를) ${storeNoun}에서 제외했습니다.`);
        markAdded(new Set([item.id]), false);
      } catch (e) {
        toast.error(errorMessage(e, '상품 제외에 실패했습니다.'));
      } finally {
        setRemovingId(null);
      }
    },
    [api, removingId, markAdded, storeNoun],
  );

  // 일괄 = 단건 endpoint fan-out (신규 backend 없음 — 기존 화면 동작 유지).
  const bulkApply = useCallback(
    async (targets: T[], opts?: { allAlreadyAdded?: boolean }) => {
      if (targets.length === 0) {
        toast.error(
          opts?.allAlreadyAdded
            ? `선택한 상품이 이미 모두 ${storeNoun}에 추가되어 있습니다.`
            : '추가할 상품을 선택해주세요.',
        );
        return { successCount: 0, failCount: 0 };
      }

      setBulkAdding(true);
      const results = await Promise.allSettled(
        targets.map((p) => api.applyBySupplyProductId(p.id).then(() => p.id)),
      );

      let successCount = 0;
      let duplicateCount = 0;
      let failCount = 0;
      const successIds = new Set<string>();

      for (const r of results) {
        if (r.status === 'fulfilled') {
          successCount++;
          successIds.add(r.value as string);
        } else if (errorCode(r.reason) === 'DUPLICATE_APPLICATION') {
          duplicateCount++;
        } else {
          failCount++;
        }
      }

      if (successIds.size > 0) markAdded(successIds, true);

      if (successCount > 0 && failCount === 0 && duplicateCount === 0) {
        toast.success(`${successCount}개 상품을 ${storeNoun}에 추가했습니다.`);
      } else if (successCount > 0) {
        const parts = [`${successCount}개 추가 완료`];
        if (duplicateCount > 0) parts.push(`${duplicateCount}개 이미 추가됨`);
        if (failCount > 0) parts.push(`${failCount}개 실패`);
        toast.success(parts.join('. ') + '.');
      } else if (duplicateCount > 0 && failCount === 0) {
        toast.error(`선택한 상품이 이미 모두 ${storeNoun}에 추가되어 있습니다.`);
      } else {
        toast.error('상품 추가에 실패했습니다. 다시 시도해주세요.');
      }

      setBulkAdding(false);
      return { successCount, failCount };
    },
    [api, markAdded, storeNoun],
  );

  return { applyingId, removingId, bulkAdding, apply, remove, bulkApply };
}
