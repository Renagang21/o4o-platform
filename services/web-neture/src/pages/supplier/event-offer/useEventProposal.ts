import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import {
  supplierKpaEventOfferApi,
  type ProposableOffer,
  type PerServiceProposalResult,
  type ProposeEventConditions,
} from '../../../lib/api';
import {
  TARGET_LABEL,
  PROPOSAL_STATUS_MESSAGE,
  PROPOSE_ERROR_MESSAGES,
  extractErrorCode,
} from './presentation';
import type { useEventOfferLists } from './useEventOfferLists';

export function useEventProposal({
  page,
  activeTab,
  fetchItems,
  loadMyProposals,
}: ReturnType<typeof useEventOfferLists>) {
  const [searchParams] = useSearchParams();

  const [proposeOpen, setProposeOpen] = useState(false);

  const [proposableOffers, setProposableOffers] = useState<ProposableOffer[]>(
    [],
  );

  const [proposableLoading, setProposableLoading] = useState(false);

  const [proposableError, setProposableError] = useState(false);

  const [proposingId, setProposingId] = useState<string | null>(null);

  const [selectedTargets, setSelectedTargets] = useState<string[]>([
    'kpa-society',
  ]);

  const toggleTarget = useCallback((key: string) => {
    setSelectedTargets((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const [eventPrice, setEventPrice] = useState<string>('');

  const [startAt, setStartAt] = useState<string>('');

  const [endAt, setEndAt] = useState<string>('');

  const [totalQuantity, setTotalQuantity] = useState<string>('');

  const [perOrderLimit, setPerOrderLimit] = useState<string>('');

  const [perStoreLimit, setPerStoreLimit] = useState<string>('');

  const selectedOffer = useMemo(
    () => proposableOffers.find((o) => o.id === selectedOfferId) ?? null,
    [proposableOffers, selectedOfferId],
  );

  const resetEventConditionInputs = useCallback(() => {
    setSelectedOfferId(null);
    setEventPrice('');
    setStartAt('');
    setEndAt('');
    setTotalQuantity('');
    setPerOrderLimit('');
    setPerStoreLimit('');
  }, []);

  const validateEventConditions = useCallback((): string | null => {
    if (!selectedOffer) return '제안할 상품을 먼저 선택하세요.';
    const epNum = Number(eventPrice);
    if (!eventPrice || !Number.isFinite(epNum) || epNum <= 0) {
      return '이벤트 가격을 0보다 큰 숫자로 입력하세요.';
    }
    if (selectedOffer.price != null && epNum > Number(selectedOffer.price)) {
      return `이벤트 가격은 일반 공급가(₩${Number(selectedOffer.price).toLocaleString()}) 이하여야 합니다.`;
    }
    if (!startAt) return '시작 일시를 입력하세요.';
    if (!endAt) return '종료 일시를 입력하세요.';
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();
    if (!Number.isFinite(startMs)) return '시작 일시 형식이 올바르지 않습니다.';
    if (!Number.isFinite(endMs)) return '종료 일시 형식이 올바르지 않습니다.';
    if (startMs >= endMs) return '시작 일시는 종료 일시보다 이전이어야 합니다.';
    const checkOptionalInt = (v: string, label: string): string | null => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return `${label}는 0 이상의 정수여야 합니다.`;
      }
      return null;
    };
    return (
      checkOptionalInt(totalQuantity, '총 수량') ||
      checkOptionalInt(perOrderLimit, '1회 주문 제한') ||
      checkOptionalInt(perStoreLimit, '매장별 제한')
    );
  }, [
    selectedOffer,
    eventPrice,
    startAt,
    endAt,
    totalQuantity,
    perOrderLimit,
    perStoreLimit,
  ]);

  const validationError = validateEventConditions();

  const loadProposableOffers = useCallback(async () => {
    setProposableLoading(true);
    setProposableError(false);
    try {
      const offers = await supplierKpaEventOfferApi.listMyOffers();
      setProposableOffers(offers);
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      const msg =
        code && PROPOSE_ERROR_MESSAGES[code]
          ? PROPOSE_ERROR_MESSAGES[code]
          : '제안 가능한 상품을 불러오지 못했습니다.';
      toast.error(msg);
      // 조회 실패는 '제안 가능 상품 없음'이 아니다 — 모달 안에서 오류+재시도 표시.
      setProposableOffers([]);
      setProposableError(true);
    } finally {
      setProposableLoading(false);
    }
  }, []);

  const handleOpenPropose = useCallback(() => {
    setProposeOpen(true);
    // 모달 열 때마다 기본값(KPA Society)으로 초기화
    setSelectedTargets(['kpa-society']);
    resetEventConditionInputs();
    loadProposableOffers();
  }, [loadProposableOffers, resetEventConditionInputs]);

  const handleClosePropose = useCallback(() => {
    setProposeOpen(false);
    setProposableOffers([]);
    setProposingId(null);
    resetEventConditionInputs();
  }, [resetEventConditionInputs]);

  const bindProductId = searchParams.get('supplierProductId');

  const bindMasterId = searchParams.get('masterId');

  const autoOpenedRef = useRef(false);

  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!bindProductId && !bindMasterId) return;
    autoOpenedRef.current = true;
    handleOpenPropose();
  }, [bindProductId, bindMasterId, handleOpenPropose]);

  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!proposeOpen || proposableOffers.length === 0) return;
    if (!bindProductId && !bindMasterId) return;
    autoSelectedRef.current = true; // 1회만 자동 선택 (이후 사용자 선택 존중)
    const match = proposableOffers.find(
      (o) => o.id === bindProductId || o.masterId === bindMasterId,
    );
    if (match) setSelectedOfferId(match.id);
  }, [proposeOpen, proposableOffers, bindProductId, bindMasterId]);

  const handlePropose = useCallback(async () => {
    if (!selectedOffer) {
      toast.error('제안할 상품을 선택하세요.');
      return;
    }
    if (selectedTargets.length === 0) {
      toast.error('대상 서비스를 1개 이상 선택해 주세요.');
      return;
    }
    const errMsg = validateEventConditions();
    if (errMsg) {
      toast.error(errMsg);
      return;
    }

    const conditions: ProposeEventConditions = {
      eventPrice: Number(eventPrice),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      totalQuantity: totalQuantity ? Number(totalQuantity) : null,
      perOrderLimit: perOrderLimit ? Number(perOrderLimit) : null,
      perStoreLimit: perStoreLimit ? Number(perStoreLimit) : null,
    };

    setProposingId(selectedOffer.id);
    try {
      const result = await supplierKpaEventOfferApi.proposeEventOfferToServices(
        selectedOffer.id,
        selectedTargets,
        conditions,
      );

      // 서비스별 결과 표시
      let createdCount = 0;
      result.results.forEach((r: PerServiceProposalResult) => {
        const label = TARGET_LABEL[r.targetServiceKey] ?? r.targetServiceKey;
        const msg =
          PROPOSAL_STATUS_MESSAGE[r.status] ?? r.message ?? '처리되었습니다.';
        if (r.status === 'created') {
          createdCount += 1;
          toast.success(`${label}: ${msg}`);
        } else {
          toast.error(`${label}: ${msg}`);
        }
      });

      if (createdCount > 0) {
        // 1건이라도 성공 → 모달 닫고 목록 새로고침
        handleClosePropose();
        fetchItems(page, activeTab);
        loadMyProposals();
      } else {
        // 전부 실패 → 모달 유지, 목록 재로드(이미 제안된 항목 제거)
        loadProposableOffers();
      }
      // 추가 안내: 모든 서비스에 성공한 경우
      if (createdCount === result.results.length && createdCount > 1) {
        toast.success(
          `"${selectedOffer.title}" 이(가) ${createdCount}개 서비스에 제안되었습니다.`,
        );
      }
    } catch (err: unknown) {
      const code = extractErrorCode(err);
      const msg =
        code && PROPOSE_ERROR_MESSAGES[code]
          ? PROPOSE_ERROR_MESSAGES[code]
          : '제안에 실패했습니다.';
      toast.error(msg);
    } finally {
      setProposingId(null);
    }
  }, [
    page,
    activeTab,
    selectedTargets,
    fetchItems,
    handleClosePropose,
    loadProposableOffers,
    loadMyProposals,
    selectedOffer,
    eventPrice,
    startAt,
    endAt,
    totalQuantity,
    perOrderLimit,
    perStoreLimit,
    validateEventConditions,
  ]);
  return {
    proposeOpen,
    proposableOffers,
    proposableLoading,
    proposableError,
    proposingId,
    selectedTargets,
    toggleTarget,
    selectedOfferId,
    setSelectedOfferId,
    eventPrice,
    setEventPrice,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    totalQuantity,
    setTotalQuantity,
    perOrderLimit,
    setPerOrderLimit,
    perStoreLimit,
    setPerStoreLimit,
    selectedOffer,
    validationError,
    loadProposableOffers,
    handleOpenPropose,
    handleClosePropose,
    handlePropose,
  };
}
