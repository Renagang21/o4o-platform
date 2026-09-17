/**
 * PolicyAcceptanceGate — 기존 회원 재동의 화면 계약
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17
 *
 * 보증: pending 없음 → children · pending 있음 → children 미렌더(닫을 수 없음) · allowPaths 예외 ·
 *       문서 id 불일치(stale) → 동의 불가 · 체크 전 동의 버튼 비활성 · 체크 후 onAccept 호출 · 실패 문구 표시.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PolicyAcceptanceGate } from '../legal/PolicyAcceptanceGate';

const PENDING = [
  { serviceKey: 'kpa-society', documentType: 'terms', policyDocumentId: 'doc-1', version: 1, title: 'O4O 통합 서비스 이용약관' },
];

const DOC = {
  id: 'doc-1',
  serviceKey: 'kpa-society',
  documentType: 'terms',
  title: 'O4O 통합 서비스 이용약관',
  slug: null,
  content: '제1조 목적 — 본문',
  version: 1,
  effectiveDate: null,
  publishedAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
};

function renderGate(opts: {
  pending?: typeof PENDING;
  path?: string;
  doc?: typeof DOC | null;
  onAccept?: () => Promise<{ success: boolean; error?: string }>;
}) {
  const loadPolicy = vi.fn(async () => (opts.doc === undefined ? DOC : opts.doc));
  const onAccept = opts.onAccept ?? vi.fn(async () => ({ success: true }));
  const onLogout = vi.fn();
  render(
    <MemoryRouter initialEntries={[opts.path ?? '/dashboard']}>
      <PolicyAcceptanceGate
        pending={opts.pending ?? PENDING}
        loadPolicy={loadPolicy}
        onAccept={onAccept}
        onLogout={onLogout}
        allowPaths={['/policy', '/privacy']}
        serviceName="KPA Society"
        termsPath="/policy"
      >
        <div data-testid="app-shell">서비스 화면</div>
      </PolicyAcceptanceGate>
    </MemoryRouter>,
  );
  return { loadPolicy, onAccept, onLogout };
}

afterEach(() => cleanup());

describe('PolicyAcceptanceGate', () => {
  it('pending 이 없으면 children 을 그대로 그린다', () => {
    const { loadPolicy } = renderGate({ pending: [] });
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(loadPolicy).not.toHaveBeenCalled();
  });

  it('pending 이 있으면 children 을 그리지 않고 약관 전문을 불러온다 (닫기 없음)', async () => {
    renderGate({});
    expect(screen.queryByTestId('app-shell')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('policy-acceptance-content').textContent).toContain('제1조 목적'));
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    expect(screen.queryByRole('button', { name: /닫기/ })).toBeNull();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
  });

  it('allowPaths(공개 약관 페이지)에서는 pending 이어도 children 을 그린다', () => {
    renderGate({ path: '/policy' });
    expect(screen.getByTestId('app-shell')).toBeTruthy();
  });

  it('체크 전에는 동의 버튼이 비활성, 체크 후 onAccept 를 호출한다', async () => {
    const { onAccept } = renderGate({});
    await waitFor(() => screen.getByTestId('policy-acceptance-content'));
    const button = screen.getByRole('button', { name: '동의하고 계속하기' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
  });

  it('불러온 문서 id 가 pending 과 다르면(게시 갱신) 동의를 열지 않고 새로고침을 안내한다', async () => {
    renderGate({ doc: { ...DOC, id: 'doc-2', version: 2 } });
    await waitFor(() => expect(screen.getByText(/약관이 갱신되었습니다/)).toBeTruthy());
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('onAccept 실패 문구를 표시하고 화면을 유지한다', async () => {
    renderGate({ onAccept: vi.fn(async () => ({ success: false, error: '현재 적용 중인 약관이 아닙니다.' })) });
    await waitFor(() => screen.getByTestId('policy-acceptance-content'));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('현재 적용 중인 약관이 아닙니다.'));
    expect(screen.queryByTestId('app-shell')).toBeNull();
  });
});
