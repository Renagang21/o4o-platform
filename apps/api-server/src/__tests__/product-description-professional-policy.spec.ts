import { buildProductContentSystemPrompt, buildProductUserPrompt, type ProductContentInput } from '../../../../packages/ai-prompts/src/store/product-content.prompt';
import { COMMON_SYSTEM_RULES } from '../services/ai-prompts/common';
import { HFF_STORE_DESCRIPTION_SYSTEM_PROMPT } from '../modules/neture/drug-import/health-functional-food-store-description.prompt';

const product: ProductContentInput = { id: 'fixture', regulatoryName: '표본', marketingName: '표본', manufacturerName: '제조사' };

describe('상품 설명 전문 활용 정책', () => {
  it.each(['professional', 'ai-support'] as const)('전문 목적 %s는 소비자 QR 글자 수·구매 유도를 적용하지 않는다', purpose => {
    const system = buildProductContentSystemPrompt('qr_description', { ...product, purpose });
    expect(system).toContain('판단 근거·추가 확인 사항');
    expect(system).not.toContain('50자~150자');
    expect(system).not.toContain('구매 의향');
  });
  it('출처 없는 전문자료는 검수 표시가 있어도 확정 근거로 전달하지 않는다', () => {
    const prompt = buildProductUserPrompt({ ...product, productFacts: '상품 원문',
      professionalReference: { content: '진단 과정 근거', source: '', reviewStatus: 'reviewed' } }, '상품 설명');
    expect(prompt).toContain('[상품 사실 근거]');
    expect(prompt).toContain('[전문 참고정보 — 검수 대기·확정 근거로 사용하지 않음]');
    expect(prompt).toContain('전문 참고정보를 제품의 확정 효과로 바꾸지 마세요');
  });
  it('소비자용 QR의 짧은 형식은 유지하되 근거 없는 사실 생성을 지시하지 않는다', () => {
    const system = buildProductContentSystemPrompt('qr_description', product);
    expect(system).toContain('50자~150자');
    expect(system).toContain('없는 효능·성분·용법을 만들지 마세요');
    expect(COMMON_SYSTEM_RULES).toContain('전문 정보를 주제 자체만으로 배제하지 않는다');
  });
  it('건기식 상품 seed의 효능 범위를 보존하고 전문 주제의 일괄 금지를 제거한다', () => {
    expect(HFF_STORE_DESCRIPTION_SYSTEM_PROMPT).toContain('functionalClaims 에 없는 기능·효능을 추가하지 않습니다');
    expect(HFF_STORE_DESCRIPTION_SYSTEM_PROMPT).toContain('전문 맥락의 처방·진단·복용법 언급 자체는 금지하지 않습니다');
    expect(HFF_STORE_DESCRIPTION_SYSTEM_PROMPT).not.toContain('질병명 언급(주의 안내 맥락)');
  });
});
