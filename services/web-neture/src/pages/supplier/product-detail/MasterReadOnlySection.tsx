/**
 * MasterReadOnlySection — ProductMaster 기준정보 (읽기 전용)
 *
 * WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A (2026-09-23)
 *   Offer-First 경계: 공급자는 Offer 를 편집하고 Master 기준정보는 읽기만 한다.
 *   이 섹션에는 편집 진입점을 두지 않는다 — 기준정보 정정은 운영자 승인 축이다.
 */
import type { ReactElement, ReactNode } from 'react';
import { Section, InfoRow } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';

export interface MasterReadOnlySectionProps {
  product: SupplierProduct;
  regType: string;
  regLabel: string;
  regBadgeCls: string;
  Badge: (props: { children: ReactNode; className: string }) => ReactElement;
}

export default function MasterReadOnlySection({ product, regType, regLabel, regBadgeCls, Badge }: MasterReadOnlySectionProps) {
  return (
      <Section title="상품 정보">
        <InfoRow label="바코드"><span className="font-mono">{product.barcode}</span></InfoRow>
        <InfoRow label="상품명">{product.name || product.masterName || '-'}</InfoRow>
        {product.regulatoryName && product.regulatoryName !== product.name && (
          <InfoRow label="규제명">{product.regulatoryName}</InfoRow>
        )}
        <InfoRow label="브랜드">{product.brandName || '-'}</InfoRow>
        <InfoRow label="카테고리">
          {product.categoryName || <span className="text-amber-600 font-medium">미지정</span>}
        </InfoRow>
        {product.specification && (
          <InfoRow label="사양">{product.specification}</InfoRow>
        )}
        {product.originCountry && (
          <InfoRow label="원산지">{product.originCountry}</InfoRow>
        )}
        <InfoRow label="규제 유형">
          <Badge className={regBadgeCls}>{regLabel}</Badge>
        </InfoRow>
        {regType !== 'GENERAL' && (
          <>
            <InfoRow label="MFDS 허가번호">
              <span className="font-mono">{product.mfdsPermitNumber || '-'}</span>
            </InfoRow>
            {product.manufacturerName && (
              <InfoRow label="제조사">{product.manufacturerName}</InfoRow>
            )}
          </>
        )}
      </Section>
  );
}
