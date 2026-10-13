import { useState, useEffect, useCallback, useRef } from 'react';
import { supplierApi, type SupplierProduct, type SpotPricePolicy } from '../../../lib/api';
import { SUPPLIER_SPOT_POLICIES_FORBIDDEN } from '../../../lib/api/supplier';
import { toast } from '@o4o/error-handling';

export function useSupplierSpotPolicies(product: SupplierProduct | null, open: boolean) {
  // WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 스팟 정책 state
  // WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1:
  //   null = 아직 못 불러옴. 정상 "정책 없음"([]) 과 타입 수준에서 구분한다.
  const [spotPolicies, setSpotPolicies] = useState<SpotPricePolicy[] | null>(null);
  const [spotLoading, setSpotLoading] = useState(false);
  const [spotError, setSpotError] = useState<null | 'load' | 'forbidden'>(null);
  const [spotFormOpen, setSpotFormOpen] = useState(false);
  const [spotForm, setSpotForm] = useState({
    policyName: '',
    spotPrice: '',
    startAt: '',
    endAt: '',
  });
  const [spotSaving, setSpotSaving] = useState(false);

  // WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 스팟 정책 로드
  // WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1:
  //   조회 실패는 throw 된다. "정책 없음" 으로 표시하지 않고 지속 오류 상태로 분리한다.
  //   초기 조회 / 생성 후 / 상태 변경 후 3개 지점이 이 함수를 공유한다.
  //   keepExisting=true 면 mutation 후 재조회 실패 시 기존 목록을 비우지 않는다.
  const spotReqRef = useRef(0);
  const loadSpotPolicies = useCallback(async (offerId: string, keepExisting = false) => {
    const reqId = ++spotReqRef.current;
    setSpotLoading(true);
    setSpotError(null);
    try {
      const rows = await supplierApi.listSpotPolicies(offerId);
      if (reqId !== spotReqRef.current) return; // stale 응답이 새 offer 를 덮어쓰지 않게 한다
      setSpotPolicies(rows);
    } catch (e: any) {
      if (reqId !== spotReqRef.current) return;
      if (!keepExisting) setSpotPolicies(null);
      setSpotError(e?.message === SUPPLIER_SPOT_POLICIES_FORBIDDEN ? 'forbidden' : 'load');
    } finally {
      if (reqId === spotReqRef.current) setSpotLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!product?.id || !open) return;
    // offer 전환·재오픈 시 이전 데이터·오류를 먼저 초기화한다.
    spotReqRef.current++;
    setSpotPolicies(null);
    setSpotError(null);
    setSpotFormOpen(false);
    loadSpotPolicies(product.id);
  }, [product?.id, open, loadSpotPolicies]);

  // WO-NETURE-PRODUCT-DRAWER-FORM-STANDARD-COMPLIANCE-V1: validation 분리
  const validateSpotForm = (): string | null => {
    if (!spotForm.policyName.trim()) return '정책명을 입력하세요';
    if (!spotForm.spotPrice) return '스팟 가격을 입력하세요';
    if (!spotForm.startAt) return '시작일을 입력하세요';
    if (!spotForm.endAt) return '종료일을 입력하세요';
    return null;
  };

  const handleSpotCreate = async () => {
    if (!product?.id) return;
    const validationError = validateSpotForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSpotSaving(true);
    const result = await supplierApi.createSpotPolicy({
      offerId: product.id,
      policyName: spotForm.policyName,
      spotPrice: Number(spotForm.spotPrice),
      startAt: spotForm.startAt,
      endAt: spotForm.endAt,
    });
    if (result.success) {
      setSpotFormOpen(false);
      setSpotForm({ policyName: '', spotPrice: '', startAt: '', endAt: '' });
      // 생성은 성공했다. 후속 재조회가 실패해도 mutation 을 실패로 뒤집지 않고
      // 기존 목록을 유지한 채 정책 영역만 오류 상태로 전환한다.
      await loadSpotPolicies(product.id, true);
    } else {
      toast.error(result.error || '스팟 정책 생성 실패');
    }
    setSpotSaving(false);
  };

  const handleSpotStatusChange = async (policyId: string, status: 'ACTIVE' | 'CANCELLED') => {
    if (!product?.id) return;
    const result = await supplierApi.changeSpotPolicyStatus(policyId, status);
    if (result.success) {
      await loadSpotPolicies(product.id, true);
    } else {
      toast.error(result.error || '상태 변경 실패');
    }
  };

  return {
    spotPolicies,
    spotLoading,
    spotError,
    spotFormOpen,
    setSpotFormOpen,
    spotForm,
    setSpotForm,
    spotSaving,
    loadSpotPolicies,
    handleSpotCreate,
    handleSpotStatusChange,
  };
}
