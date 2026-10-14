import type { useSupplierDashboard } from './useSupplierDashboard';
import { PROFILE_FIELD_LABELS } from '../../../lib/api';
import {
  countBy,
  SUPPLIER_STATUS_LABELS,
  type ActionItem,
  type OpsArea,
} from './presentation';

export function dashboardView(data: ReturnType<typeof useSupplierDashboard>) {
  const {
    recruitments,
    storeDescs,
    trials,
    profile,
    orderKpi,
    inventory,
    approval,
    settlementKpi,
    opsFailed,
    approvalError,
    cdFailed,
    loading,
  } = data;
  /* ---- 파생 값 ---- */

  // 실패 영역(null)은 0 이 아니라 "계산 불가" 다. 아래 actionItems 필터에서 후보 제외한다.
  const recruitmentPending = (recruitments ?? []).reduce(
    (sum, r) => sum + (r.applications?.pending ?? 0),
    0,
  );
  const descRevisionRequested = (storeDescs ?? []).filter(
    (d) => d.status === 'revision_requested',
  ).length;
  const profileComplete =
    profile == null
      ? true // 미확인 시 미완료로 단정하지 않는다 (fail-open — SupplierActivationGate 와 동일)
      : typeof profile.profileComplete === 'boolean'
        ? profile.profileComplete
        : (
            profile.missingProfileFields ??
            profile.missingActivationFields ??
            []
          ).length === 0;
  const missingProfileLabels = (
    profile?.missingProfileFields ??
    profile?.missingActivationFields ??
    []
  ).map((f) => PROFILE_FIELD_LABELS[f] || f);

  const actionCandidates: ActionItem[] = [
    {
      key: 'orders-processing',
      label: '처리 대기 주문',
      value: orderKpi?.pending_processing ?? 0,
      unit: '건',
      to: '/supplier/orders',
      tone: 'red',
    },
    {
      key: 'orders-shipping',
      label: '배송 준비 주문',
      value: orderKpi?.pending_shipping ?? 0,
      unit: '건',
      to: '/supplier/orders',
      tone: 'amber',
    },
    {
      key: 'inv-out',
      label: '품절 상품',
      value: inventory?.outOfStock ?? 0,
      unit: '개',
      to: '/supplier/inventory',
      tone: 'red',
    },
    {
      key: 'inv-low',
      label: '재고 부족 상품',
      value: inventory?.lowStock ?? 0,
      unit: '개',
      to: '/supplier/inventory',
      tone: 'amber',
    },
    {
      key: 'desc-revision',
      label: '설명서 수정 요청',
      value: descRevisionRequested,
      unit: '건',
      to: '/supplier/store-descriptions',
      tone: 'red',
    },
    {
      key: 'recruit-pending',
      label: '판매자 모집 신청 대기',
      value: recruitmentPending,
      unit: '건',
      to: '/supplier/recruitments',
      tone: 'amber',
    },
    {
      key: 'product-approval',
      label: '상품 승인 대기',
      value: approval?.pending ?? 0,
      unit: '개',
      to: '/supplier/products',
      tone: 'amber',
    },
    {
      key: 'settlement',
      label: '정산 대기',
      value: settlementKpi?.pending_count ?? 0,
      unit: '건',
      to: '/supplier/settlements',
      tone: 'amber',
    },
  ];
  // 실패 영역의 카드는 값이 없으므로 아예 후보에서 제외한다 (0 으로 표시하지 않는다).
  const actionItems = actionCandidates.filter((a) => {
    if (a.value <= 0) return false;
    if (opsFailed.orders && a.key.startsWith('orders-')) return false;
    if (opsFailed.inventory && a.key.startsWith('inv-')) return false;
    if (opsFailed.settlements && a.key === 'settlement') return false;
    if (approvalError && a.key === 'product-approval') return false;
    if (cdFailed.storeDescriptions && a.key === 'desc-revision') return false;
    if (cdFailed.recruitments && a.key === 'recruit-pending') return false;
    return true;
  });

  const failedAreas = (Object.keys(opsFailed) as OpsArea[]).filter(
    (k) => opsFailed[k],
  );
  // 콘텐츠·유통 실패는 처리 필요 판단을 불완전하게 만든다 → 정상 문구를 단정하지 않는다.
  const cdActionAffected = cdFailed.storeDescriptions || cdFailed.recruitments;
  const showProfileAction = !loading && profile != null && !profileComplete;
  const hasAnyAction = actionItems.length > 0 || showProfileAction;

  const supplierStatusRaw = String(profile?.status ?? '').toUpperCase();
  const supplierStatusLabel = supplierStatusRaw
    ? (SUPPLIER_STATUS_LABELS[supplierStatusRaw] ?? supplierStatusRaw)
    : null;

  const descCounts = countBy(storeDescs ?? [], (d) => d.status);
  const trialCounts = countBy(trials ?? [], (t) => String(t.status));
  const recruitmentOpen = (recruitments ?? []).filter(
    (r) => String(r.status).toLowerCase() === 'open',
  ).length;

  return {
    recruitmentPending,
    profileComplete,
    missingProfileLabels,
    actionItems,
    failedAreas,
    cdActionAffected,
    showProfileAction,
    hasAnyAction,
    supplierStatusLabel,
    descCounts,
    trialCounts,
    recruitmentOpen,
  };
}
