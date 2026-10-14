import type { ServiceApprovalItem } from '../../lib/api/serviceApproval';

export const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '승인대기', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: '승인됨', bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { label: '거절됨', bg: 'bg-red-50', text: 'text-red-700' },
};

// ==================== Helpers ====================

export function getRegulatoryBadge(item: ServiceApprovalItem): { label: string; bg: string; text: string } {
  const rt = item.regulatoryType;
  if (!rt || rt === 'GENERAL') return { label: '일반', bg: 'bg-slate-50', text: 'text-slate-500' };
  if (!item.mfdsPermitNumber) return { label: '⚠ 허가없음', bg: 'bg-red-50', text: 'text-red-700' };
  if (item.isMfdsVerified) return { label: '검증됨', bg: 'bg-green-50', text: 'text-green-700' };
  return { label: '미검증', bg: 'bg-amber-50', text: 'text-amber-700' };
}

export function getCompletenessBadge(item: ServiceApprovalItem): { label: string; bg: string; text: string } {
  if (item.offerApprovalStatus === 'approved') return { label: 'APPROVED', bg: 'bg-green-50', text: 'text-green-700' };
  const score = item.completenessScore || 0;
  if (score >= 60) return { label: 'READY', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (score > 0) return { label: 'INCOMPLETE', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { label: 'DRAFT', bg: 'bg-slate-50', text: 'text-slate-500' };
}

export function hasPermitRisk(item: ServiceApprovalItem): boolean {
  const rt = item.regulatoryType;
  return !!rt && rt !== 'GENERAL' && !item.mfdsPermitNumber;
}

export function formatPrice(price: number | null): string {
  if (price == null) return '-';
  return `₩${price.toLocaleString('ko-KR')}`;
}

// WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: 품질 판단 헬퍼

export function getQualityFlags(item: ServiceApprovalItem): string[] {
  const flags: string[] = [];
  if (!item.imageUrl) flags.push('이미지 없음');
  if (!item.priceGeneral || item.priceGeneral <= 0) flags.push('가격 미설정');
  if (!item.hasShortDescription) flags.push('간단 설명 없음');
  if (!item.hasDetailDescription) flags.push('상세 설명 없음');
  if (!item.distributionType) flags.push('유통 타입 미설정');
  return flags;
}

export function getRecommendation(score: number): { label: string; bg: string; text: string; icon: string } {
  if (score >= 80) return { label: '승인 추천', bg: 'bg-green-50', text: 'text-green-700', icon: '✓' };
  if (score >= 60) return { label: '검토 필요', bg: 'bg-amber-50', text: 'text-amber-700', icon: '!' };
  return { label: '보완 필요', bg: 'bg-red-50', text: 'text-red-700', icon: '✕' };
}
