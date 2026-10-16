import type { ComponentType, ReactNode } from 'react';
import { InfoRow, Section } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';
import { DISTRIBUTION_TYPE_BADGE } from '../../../lib/productConstants';

const APPROVAL_BADGES: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: '승인', cls: 'bg-green-50 text-green-700' },
  PENDING: { label: '대기', cls: 'bg-amber-50 text-amber-700' },
  REJECTED: { label: '거부', cls: 'bg-red-50 text-red-700' },
};

function approvalBadge(status: unknown) {
  const fallback = { label: '-', cls: 'bg-slate-100 text-slate-600' };
  if (typeof status !== 'string' || !status) return fallback;
  return APPROVAL_BADGES[status] ?? { ...fallback, label: status };
}

export default function SupplierProductStatusSection({ product, isEditing, completeness, Badge }: Readonly<{
  product: SupplierProduct;
  isEditing: boolean;
  completeness: {
    score: number;
    scoreColor: string;
    scoreBgColor: string;
    compCfg: { label: string; cls: string };
  };
  Badge: ComponentType<{ children: ReactNode; className: string }>;
}>) {
  const distribution = DISTRIBUTION_TYPE_BADGE[product.distributionType] ?? DISTRIBUTION_TYPE_BADGE.PUBLIC;
  const approval = approvalBadge(product.approvalStatus);
  const { score, scoreColor, scoreBgColor, compCfg } = completeness;
  return (
    <Section title="상태">
      {!isEditing && (
        <InfoRow label="제품 이용">
          <Badge className={product.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}>
            {product.isActive ? '활성' : '비활성'}
          </Badge>
        </InfoRow>
      )}
      <InfoRow label="일반 공급 범위">
        <Badge className={`${distribution.bg} ${distribution.text}`}>{product.defaultSupplyEnabled ? 'Neture 기본 공급' : distribution.label}</Badge>
      </InfoRow>
      <InfoRow label="제품 등록 승인"><Badge className={approval.cls}>{approval.label}</Badge></InfoRow>
      {product.registrationRejectionReason && <InfoRow label="등록 검토 사유">{product.registrationRejectionReason}</InfoRow>}
      <InfoRow label="완성도">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full ${scoreBgColor} rounded-full`} style={{ width: `${score}%` }} />
          </div>
          <span className={`text-xs font-medium ${scoreColor}`}>{score}%</span>
          <Badge className={compCfg.cls}>{compCfg.label}</Badge>
        </div>
      </InfoRow>
    </Section>
  );
}
