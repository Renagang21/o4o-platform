/**
 * OfferDistributionSection — 공급 방식(유통 정책 · 서비스 대상 · 서비스별 공급가) 요약
 *
 * WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A (2026-09-23)
 *   ProductDetailDrawer 분해. Offer 축(SupplierProductOffer)의 배포 설정만 다룬다 —
 *   ProductMaster 기준정보는 MasterReadOnlySection 이 읽기 전용으로 보여준다.
 *   distributionType(내부 용어)은 노출하지 않고 isPublic + serviceKeys 파생 라벨을 쓴다.
 */
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import { Section, InfoRow } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';

export interface OfferDistributionSectionProps {
  product: SupplierProduct;
  navigate: (path: string) => void;
  svcPrices: { priceGeneral: number; prices: Array<{ serviceKey: string; unitPrice: number }> } | null;
  setSvcPriceForm: Dispatch<SetStateAction<Record<string, string>>>;
  setSvcPriceOpen: Dispatch<SetStateAction<boolean>>;
  showSupplyGuide: boolean;
  setShowSupplyGuide: Dispatch<SetStateAction<boolean>>;
  isEditing: boolean;
  setDistForm: Dispatch<SetStateAction<{ isPublic: boolean; serviceKeys: string[] }>>;
  setDistConfirmRemove: Dispatch<SetStateAction<string[] | null>>;
  setDistMgmtOpen: Dispatch<SetStateAction<boolean>>;
  formatPrice: (v: number | null | undefined) => string;
  Badge: (props: { children: ReactNode; className: string }) => ReactElement;
}

export default function OfferDistributionSection({
  product,
  navigate,
  svcPrices,
  setSvcPriceForm,
  setSvcPriceOpen,
  showSupplyGuide,
  setShowSupplyGuide,
  isEditing,
  setDistForm,
  setDistConfirmRemove,
  setDistMgmtOpen,
  formatPrice,
  Badge,
}: OfferDistributionSectionProps) {
          const supplyKeys = (product.serviceKeys || []).filter((k) => k !== 'neture');
          const isPub = (product as any).isPublic ?? (product.distributionType === 'PUBLIC');
          let supplyLabel: string, supplyDesc: string, supplyCls: string;
          if (isPub) {
            supplyLabel = 'B2B 전체 공급';
            supplyDesc = '서비스 운영자 승인 없이 HUB에 노출될 수 있습니다.';
            supplyCls = 'bg-blue-50 text-blue-700';
          } else if (supplyKeys.length > 0) {
            supplyLabel = '서비스 공급';
            supplyDesc = '선택한 서비스 운영자의 승인 후 해당 서비스 HUB에 노출됩니다.';
            supplyCls = 'bg-purple-50 text-purple-700';
          } else {
            supplyLabel = '내부 상품';
            supplyDesc = '아직 공급 방식이 설정되지 않아 HUB에 노출되지 않습니다.';
            supplyCls = 'bg-slate-100 text-slate-600';
          }
          return (
            <Section title="공급 방식">
              <InfoRow label="현재 공급 방식"><Badge className={supplyCls}>{supplyLabel}</Badge></InfoRow>
              <p className="text-[11px] text-slate-400 -mt-1 mb-1">{supplyDesc}</p>
              <InfoRow label="기본 B2B 공급가">{formatPrice(product.priceGeneral)}</InfoRow>
              <InfoRow label="노출 상태">
                <Badge className={product.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}>
                  {product.isActive ? '노출 활성' : '미노출'}
                </Badge>
              </InfoRow>
              {supplyKeys.length > 0 && (
                <div className="space-y-1 mt-1">
                  <span className="text-xs text-slate-500">서비스별 승인</span>
                  {supplyKeys.map((sk) => {
                    const sa = (product.serviceApprovals || []).find((a) => a.serviceKey === sk);
                    const st = sa?.status;
                    return (
                      <div key={sk} className="flex items-center justify-between pl-3">
                        <span className="text-xs text-slate-600">{sk}</span>
                        <Badge className={
                          st === 'approved' ? 'bg-green-50 text-green-700'
                            : st === 'pending' ? 'bg-amber-50 text-amber-700'
                            : st === 'rejected' ? 'bg-red-50 text-red-700'
                            : st === 'cancelled' ? 'bg-slate-200 text-slate-600'
                            : 'bg-slate-100 text-slate-500'
                        }>
                          {st === 'approved' ? '승인됨' : st === 'pending' ? '승인대기' : st === 'rejected' ? '반려됨' : st === 'cancelled' ? '철회됨' : '미신청'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: 서비스별 공급가 */}
              {supplyKeys.length > 0 && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">서비스별 공급가</span>
                    <button
                      type="button"
                      onClick={() => {
                        const form: Record<string, string> = {};
                        (svcPrices?.prices || []).forEach((p) => { form[p.serviceKey] = String(p.unitPrice); });
                        setSvcPriceForm(form);
                        setSvcPriceOpen(true);
                      }}
                      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                    >설정</button>
                  </div>
                  {supplyKeys.map((sk) => {
                    const sp = (svcPrices?.prices || []).find((p) => p.serviceKey === sk);
                    return (
                      <div key={sk} className="flex items-center justify-between pl-3">
                        <span className="text-xs text-slate-600">{sk}</span>
                        <span className="text-xs text-slate-700">{sp ? formatPrice(sp.unitPrice) : <span className="text-slate-400">기본가 적용</span>}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">이벤트 오퍼는 공급 방식 변경이 아니라 별도로 생성합니다.</p>

              {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1: 공급 방식 변경 진입 */}
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setDistForm({ isPublic: isPub, serviceKeys: [...supplyKeys] });
                    setDistConfirmRemove(null);
                    setDistMgmtOpen(true);
                  }}
                  className="mt-3 w-full py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  공급 방식 변경
                </button>
              )}

              {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-ENTRY-V1:
                  공급 방식 관리 진입 + 정책 안내(읽기 전용). */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplyGuide((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  aria-expanded={showSupplyGuide}
                >
                  {showSupplyGuide ? '▾' : '▸'} 공급 방식 관리 · 정책 안내
                </button>
                {showSupplyGuide && (
                  <div className="mt-2 space-y-2 rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">B2B 전체 공급</p>
                      <p className="text-[11px] text-slate-500">서비스 운영자 승인 없이 HUB에 노출됩니다.</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">서비스 공급</p>
                      <p className="text-[11px] text-slate-500">선택한 서비스 운영자의 승인 후 해당 서비스 HUB에 노출됩니다.</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">내부 상품</p>
                      <p className="text-[11px] text-slate-500">공급 방식이 설정되지 않아 HUB에 노출되지 않습니다.</p>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      공급 방식은 상품 편집에서 전체 공개 여부와 서비스 공급 대상을 조정합니다. 공급 방식별 안내는 공급 오퍼 화면에서 확인할 수 있습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-TO-EVENT-OFFER-ENTRY-V1: 이벤트 오퍼 진입 (공급 방식 변경 아님) */}
              {!isEditing && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 mb-0.5">이벤트 오퍼</p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    이벤트 오퍼는 상품의 공급 방식을 바꾸지 않습니다. 기존 상품을 기준으로 대상 서비스·이벤트 가격·기간·수량 조건을 별도로 설정합니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/supplier/event-offers?supplierProductId=${product.id}&masterId=${product.masterId}&name=${encodeURIComponent(product.name || product.masterName || '')}&priceGeneral=${product.priceGeneral ?? ''}`)}
                    className="w-full py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200"
                  >
                    이 상품으로 이벤트 오퍼 만들기
                  </button>
                </div>
              )}
            </Section>
          );
}
