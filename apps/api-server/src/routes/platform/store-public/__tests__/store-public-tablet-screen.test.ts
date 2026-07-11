/**
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1
 * template renderer helpers 단위 테스트.
 */
import { resolveTemplateKey, shapeStaticBlock, DEFAULT_TABLET_TEMPLATE_KEY } from '../store-public-tablet-screen.js';

describe('resolveTemplateKey', () => {
  it('defaults when no template_key (현재 스키마)', () => {
    expect(resolveTemplateKey(null)).toBe(DEFAULT_TABLET_TEMPLATE_KEY);
    expect(resolveTemplateKey({})).toBe(DEFAULT_TABLET_TEMPLATE_KEY);
    expect(resolveTemplateKey({ templateKey: '' })).toBe(DEFAULT_TABLET_TEMPLATE_KEY);
  });
  it('uses template_key when present (후속 컬럼 도입 대비)', () => {
    expect(resolveTemplateKey({ templateKey: 'product_focus' })).toBe('product_focus');
  });
});

describe('shapeStaticBlock', () => {
  it('corner_description / health_info → title/body when present', () => {
    expect(shapeStaticBlock('corner_description', { title: '코너', body: '설명' })).toEqual({ title: '코너', body: '설명' });
    expect(shapeStaticBlock('health_info', { body: '정보' })).toEqual({ title: '', body: '정보' });
  });
  it('empty text → null (섹션 생략)', () => {
    expect(shapeStaticBlock('corner_description', {})).toBeNull();
    expect(shapeStaticBlock('staff_inquiry', { message: '' })).toBeNull();
  });
  it('staff_inquiry / qr_guide', () => {
    expect(shapeStaticBlock('staff_inquiry', { message: '문의' })).toEqual({ message: '문의' });
    expect(shapeStaticBlock('qr_guide', { label: '안내', url: 'https://x' })).toEqual({ label: '안내', url: 'https://x' });
  });
  it('bad config → null (안전)', () => {
    expect(shapeStaticBlock('corner_description', null)).toBeNull();
    expect(shapeStaticBlock('corner_description', [])).toBeNull();
    expect(shapeStaticBlock('idle_media', { source: 'x' })).toBeNull(); // handler async 담당
  });
});
