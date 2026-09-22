/**
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 — Prompt Core 계약 테스트
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSupplierProductAuthoringPrompt,
  SUPPLIER_PRODUCT_LLM_ASSIST_LABEL,
  SUPPLIER_PRODUCT_OUTPUT_RULES,
} from '../prompt';

const CONTRACT_KEYS = [
  'name', 'barcode', 'categoryId', 'brandId', 'brandName', 'manufacturerName', 'specification',
  'originCountry', 'regulatoryType', 'drugCategory', 'regulatoryName', 'mfdsPermitNumber',
  'imageUrl', 'contentImageUrls', 'offerDraft',
  'priceGeneral', 'consumerReferencePrice', 'consumerShortDescription', 'consumerDetailDescription', 'isFeatured',
];

describe('buildSupplierProductAuthoringPrompt', () => {
  it('Task · Source Context · Output Contract 3부 구조와 계약 키 전부를 포함한다', () => {
    const p = buildSupplierProductAuthoringPrompt({ sourceKind: 'manual' });
    expect(p).toContain('[작업]');
    expect(p).toContain('[자료와 현재 상태]');
    expect(p).toContain('[출력 규칙]');
    expect(p).toContain('[출력 형식 — JSON 객체 1개]');
    for (const key of CONTRACT_KEYS) expect(p).toContain(`"${key}"`);
    for (const rule of SUPPLIER_PRODUCT_OUTPUT_RULES) expect(p).toContain(rule);
  });

  it('추측 금지 규칙(바코드·허가번호·categoryId·brandId·OTC/Rx·supplierId·masterId·모르면 null)을 명시한다', () => {
    const p = buildSupplierProductAuthoringPrompt({});
    expect(p).toMatch(/barcode.*생성하지 마세요/);
    expect(p).toMatch(/mfdsPermitNumber.*생성하지 마세요/);
    expect(p).toContain('brandId 를 추측하지 마세요');
    expect(p).toContain('categoryId · brandId · drugCategory · imageUrl · contentImageUrls 는 항상 null');
    expect(p).toMatch(/OTC.*Rx.*추측하지 마세요/);
    expect(p).toContain('supplierId · masterId · serviceKeys · distributionType');
    expect(p).toContain('반드시 null 로 두세요');
  });

  it('sourceKind 별 안내: image/pdf 는 사용자가 자기 대화에 첨부 · url 은 URL 표기 · import 는 자동 추출 초안', () => {
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'image' })).toContain('제품 사진');
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'image' })).toContain('이 대화에 첨부');
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'pdf', sourceLabel: 'catalog-2026.pdf' })).toContain('자료 설명: catalog-2026.pdf');
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'pdf' })).toContain('PDF');
    const url = buildSupplierProductAuthoringPrompt({ sourceKind: 'url', sourceUrl: 'https://example.com/p/1' });
    expect(url).toContain('제품 상세 URL: https://example.com/p/1');
    // url 이 아닌 sourceKind 에서는 sourceUrl 을 넣지 않는다
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'manual', sourceUrl: 'https://x.y' })).not.toContain('https://x.y');
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'import' })).toContain('자동 추출한 초안');
  });

  it('현재 Draft 의 비어 있지 않은 값만 참고로 넣고 · 제품 유형/규제 힌트 · 추가 요청을 반영한다', () => {
    const p = buildSupplierProductAuthoringPrompt({
      productTypeLabel: '비의약품',
      regulatoryType: 'HEALTH_FUNCTIONAL',
      currentDraft: {
        name: '홍삼정 골드',
        barcode: null,
        manufacturerName: '  ',
        offerDraft: { priceGeneral: 12000, consumerReferencePrice: null, consumerShortDescription: null, consumerDetailDescription: null, isFeatured: false },
      },
      additionalInstruction: '영문명은 빼 주세요',
    });
    expect(p).toContain('- 제품명: 홍삼정 골드');
    expect(p).not.toContain('- 바코드:');
    expect(p).not.toContain('- 제조사:');
    expect(p).toContain('- 공급가: 12000');
    expect(p).toContain('등록 제품 구분(사용자 선택): 비의약품');
    expect(p).toContain('건강기능식품 (HEALTH_FUNCTIONAL)');
    expect(p).toContain('추가 요청: 영문명은 빼 주세요');
  });

  it('currentDraft 가 없으면 "현재 입력값" 절을 만들지 않는다', () => {
    expect(buildSupplierProductAuthoringPrompt({ sourceKind: 'manual' })).not.toContain('현재 입력값(참고');
  });

  it('CTA 문구는 Store 의 STORE_LLM_ASSIST_LABEL 과 동일하다(플랫폼 공통 "ChatGPT로 작업")', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../../../../packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts'),
      'utf8',
    );
    const m = src.match(/STORE_LLM_ASSIST_LABEL\s*=\s*'([^']+)'/);
    expect(m?.[1]).toBe(SUPPLIER_PRODUCT_LLM_ASSIST_LABEL);
    expect(SUPPLIER_PRODUCT_LLM_ASSIST_LABEL).toBe('ChatGPT로 작업');
  });
});
