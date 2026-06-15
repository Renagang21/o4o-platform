/**
 * SupplierProductRegisterEntryPage — 제품 등록 진입 (의약품/비의약품 2분기 → 등록 방식)
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-ENTRY-FLOW-POLICY-V1
 *   선행: WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1 (5유형 카드 → 본 WO 에서 2분기로 단순화)
 *
 * 제품 등록 1차 흐름:
 *   1) 1차 선택: 의약품 / 비의약품
 *        - 비의약품 → 표준 등록 폼 (productType=non_drug, regulatoryType=GENERAL).
 *          의약외품/의료기기/건기식/화장품 등 세부 분류는 폼 내 "규제 구분" 참고 항목으로 둔다(강제 안 함).
 *        - 의약품 → 비처방 의약품 / 처방 의약품 중 선택 후 진행 (기존 otc_drug/rx_drug internal value 재사용).
 *   2) 등록 방식 선택 (하나씩 / 대량)
 *        → 단일: /supplier/products/new?regulatoryType=..&productType=..
 *        → 대량: /supplier/products/bulk?productType=..
 *
 * O4O 는 비의약품의 허가·신고·심의 적합성을 등록 과정에서 인증하지 않으며 공급자 책임하에 등록한다.
 * 의약품은 공급자 의약품 품목군 approved gate(승인요청 시) 및 약국 대상 서비스 연결 제한이 적용된다.
 * B2B 등록·서비스 승인 제품·판매자 모집·이벤트 오퍼·유통참여형 펀딩은 제품 등록 후 제품 목록에서 연결한다(별도 메뉴).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Layers, ArrowRight, AlertTriangle, Pill, Box } from 'lucide-react';
import { getSupplierProductType, type SupplierProductTypeDef } from '../../lib/supplierProductTypes';

const NON_DRUG = getSupplierProductType('non_drug')!;
const OTC_DRUG = getSupplierProductType('otc_drug')!;
const RX_DRUG = getSupplierProductType('rx_drug')!;

type TopChoice = 'drug' | 'non_drug';

export default function SupplierProductRegisterEntryPage() {
  const navigate = useNavigate();
  const [topChoice, setTopChoice] = useState<TopChoice | null>(null);
  const [drugSub, setDrugSub] = useState<SupplierProductTypeDef | null>(null);

  // 등록 방식 단계로 진입할 최종 선택 유형
  const selected: SupplierProductTypeDef | null =
    topChoice === 'non_drug' ? NON_DRUG : topChoice === 'drug' ? drugSub : null;

  const goSingle = (t: SupplierProductTypeDef) => {
    const params = new URLSearchParams({ productType: t.key });
    if (t.regulatoryType) params.set('regulatoryType', t.regulatoryType);
    navigate(`/supplier/products/new?${params.toString()}`);
  };

  const goBulk = (t: SupplierProductTypeDef) => {
    navigate(`/supplier/products/bulk?productType=${t.key}`);
  };

  const selectTop = (choice: TopChoice) => {
    setTopChoice(choice);
    setDrugSub(null);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">제품 등록</h1>
        <p className="text-sm text-slate-500 mt-1">
          등록할 제품이 <strong>의약품</strong>인지 <strong>비의약품</strong>인지 먼저 선택하세요.
          선택에 따라 입력 항목과 검토 절차가 달라집니다.
        </p>
      </div>

      {/* Step 1: 의약품 / 비의약품 */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-slate-500 mb-2">1. 제품 구분 선택</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => selectTop('non_drug')}
            className={`text-left rounded-lg border p-4 transition-colors ${
              topChoice === 'non_drug' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-slate-800">비의약품</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              의약품 외 일반 상품입니다. O4O 는 비의약품의 허가·신고·심의 적합성을 등록 과정에서 인증하지 않으며,
              공급자 책임하에 등록됩니다.
            </p>
          </button>

          <button
            onClick={() => selectTop('drug')}
            className={`text-left rounded-lg border p-4 transition-colors ${
              topChoice === 'drug' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-800">의약품</span>
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">약국 대상</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              일반의약품 또는 전문의약품입니다. 의약품 취급 가능 상태가 확인된 공급자만 승인요청할 수 있으며,
              서비스 등록 시 약국 대상 서비스에만 연결할 수 있습니다.
            </p>
          </button>
        </div>
      </div>

      {/* Step 1b: 의약품 세부 구분 (비처방 / 처방) */}
      {topChoice === 'drug' && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-slate-500 mb-2">1-1. 의약품 세부 구분</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[OTC_DRUG, RX_DRUG].map((t) => {
              const active = drugSub?.key === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setDrugSub(t)}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="font-medium text-slate-800">{t.label}</span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            바코드·표준코드·품목기준코드 등 식별 정보가 있는 경우 입력해 주세요. 식별 정보가 없어도 임시 저장은 가능합니다.
          </p>
        </div>
      )}

      {/* Step 2: 등록 방식 */}
      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500 mb-1">2. 등록 방식 선택</div>
          <p className="text-sm text-slate-700 mb-4">
            선택한 유형: <strong>{topChoice === 'non_drug' ? '비의약품' : selected.label}</strong>
          </p>

          {selected.rx && (
            <div className="mb-4 flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                처방의약품은 <strong>O4O 유통 정보화 범위</strong>로만 등록됩니다(재고·유효기간·일련번호 관리 아님).
                일반 공급 오퍼·이벤트 오퍼·유통참여형 펀딩으로 <strong>자동 연결되지 않으며</strong>, 등록 후 운영자 검토를 거칩니다.
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => goSingle(selected)}
              className="flex items-center justify-between rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 p-4 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>
                  <span className="block font-medium text-slate-800">하나씩 등록</span>
                  <span className="block text-xs text-slate-500">단일 제품을 단계별로 입력</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => goBulk(selected)}
              className="flex items-center justify-between rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 p-4 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>
                  <span className="block font-medium text-slate-800">대량 등록</span>
                  <span className="block text-xs text-slate-500">유형별 템플릿으로 여러 제품 등록</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {topChoice === 'non_drug' && (
            <p className="mt-3 text-xs text-slate-400">
              의약외품·의료기기·건강기능식품·화장품 등 세부 분류는 등록 폼의 <strong>규제 구분</strong> 항목에서 선택할 수 있습니다(선택 사항).
            </p>
          )}
        </div>
      )}

      {/* 하단: 제품 등록 후 연결 메뉴 안내 */}
      <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>B2B 등록, 서비스 운영자 승인 제품 등록, 판매자 모집, 이벤트 오퍼, 유통참여형 펀딩</strong>은
          제품 등록 후 <strong>제품 목록</strong>에서 연결할 수 있습니다. 제품을 먼저 등록한 뒤 활용하세요.
        </p>
      </div>
    </div>
  );
}
