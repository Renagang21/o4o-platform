import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from './StoreQrAiDescriptionPage';

vi.mock('@o4o/content-editor', () => ({
  RichTextEditor: () => null,
  ContentRenderer: () => null,
  LlmAssistPanel: ({ guideText }: { guideText: (input: { additionalInstruction: string }) => string }) =>
    <output aria-label="작성 요청문">{guideText({ additionalInstruction: '' })}</output>,
}));
vi.mock('../../api/client', () => ({ apiClient: { post: vi.fn() } }));
vi.mock('../../api/storeQr', () => ({ createStoreQrCode: vi.fn() }));
vi.mock('../../api/assetSnapshot', () => ({ directContentApi: { get: vi.fn(), update: vi.fn() } }));
vi.mock('../../lib/serviceContext', () => ({ getActiveServicePublicOrigin: () => 'https://example.invalid' }));
vi.mock('@o4o/error-handling', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
afterEach(cleanup);

describe('QR 설명 편집 세션의 근거 보존', () => {
  it.each(['single', 'corner'])('%s 강조점 변경은 입력한 목적·근거·검수 상태를 지우지 않는다', mode => {
    render(<MemoryRouter><Page /></MemoryRouter>);
    if (mode === 'single') {
      fireEvent.change(screen.getByPlaceholderText('예: 종합비타민 골드'), { target: { value: '검증용 상품' } });
    } else {
      fireEvent.click(screen.getByRole('button', { name: '코너·다품목' }));
      fireEvent.change(screen.getByPlaceholderText('예: 환절기 면역 코너'), { target: { value: '검증용 코너' } });
      fireEvent.change(screen.getByPlaceholderText('상품명'), { target: { value: '검증용 상품' } });
    }
    fireEvent.change(screen.getByLabelText('설명서 이용 목적'), { target: { value: 'ai-support' } });
    fireEvent.change(screen.getByLabelText('상품 사실 원문'), { target: { value: '검증용 상품 원문' } });
    fireEvent.change(screen.getByLabelText('상품 원문 출처·확인일'), { target: { value: '검증용 공식 자료' } });
    fireEvent.change(screen.getByLabelText('전문 참고정보'), { target: { value: '진단·감별의 전문 참고정보' } });
    fireEvent.change(screen.getByLabelText('전문 자료 출처·확인일'), { target: { value: '검증용 전문 지침' } });
    fireEvent.click(screen.getByLabelText('전문 참고자료의 출처와 내용을 검수했습니다'));
    fireEvent.change(screen.getByPlaceholderText(mode === 'single' ? '예: 하루 한 알, 가족 모두' : '강조점(선택)'), { target: { value: '변경한 강조점' } });
    expect((screen.getByLabelText('설명서 이용 목적') as HTMLSelectElement).value).toBe('ai-support');
    expect((screen.getByLabelText('상품 사실 원문') as HTMLTextAreaElement).value).toBe('검증용 상품 원문');
    expect((screen.getByLabelText('상품 원문 출처·확인일') as HTMLInputElement).value).toBe('검증용 공식 자료');
    expect((screen.getByLabelText('전문 참고정보') as HTMLTextAreaElement).value).toBe('진단·감별의 전문 참고정보');
    expect((screen.getByLabelText('전문 자료 출처·확인일') as HTMLInputElement).value).toBe('검증용 전문 지침');
    expect((screen.getByLabelText('전문 참고자료의 출처와 내용을 검수했습니다') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText('작성 요청문').textContent).toContain('변경한 강조점');
  });
});
