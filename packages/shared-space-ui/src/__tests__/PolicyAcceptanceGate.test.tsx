/**
 * PolicyAcceptanceGate — 기존 회원 재동의 화면 계약
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §17
 *
 * 보증: pending 없음 → children · pending 있음 → children 미렌더(닫을 수 없음) · allowPaths 예외 ·
 *       문서 id 불일치(stale) → 동의 불가 · 체크 전 동의 버튼 비활성 · 체크 후 onAccept 호출 · 실패 문구 표시.
 */

import { useState } from 'react';
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
        termsServiceKey="kpa-society"
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
    const { onAccept, onLogout } = renderGate({});
    const home = screen.getByRole('link', { name: 'O4O 메인으로' });
    expect(home.getAttribute('href')).toBe('https://neture.co.kr/');
    expect(screen.getByRole('dialog').contains(home)).toBe(true);
    home.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(home);
    expect(onAccept).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.queryByTestId('app-shell')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('policy-acceptance-content').textContent).toContain('제1조 목적'));
    expect(screen.getByRole('link', { name: 'O4O 통합 서비스 이용약관 전문 새 탭에서 보기' }).getAttribute('href')).toBe('/policy');
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
  it('동의 후 갱신된 pending이 비면 서비스로 복귀하고 약관을 다시 표시하지 않는다', async () => {
    const loadPolicy = vi.fn(async () => DOC);
    const accepted = vi.fn();
    function UpdatedSession() {
      const [pending, setPending] = useState(PENDING);
      return <PolicyAcceptanceGate pending={pending} loadPolicy={loadPolicy}
        onAccept={async () => { accepted(); setPending([]); return { success: true }; }}
        onLogout={() => {}} allowPaths={[]} serviceName="Fixture" termsPath="/terms">
        <div data-testid="accepted-service">서비스 화면</div>
      </PolicyAcceptanceGate>;
    }
    render(<MemoryRouter initialEntries={['/dashboard']}><UpdatedSession /></MemoryRouter>);
    await waitFor(() => screen.getByTestId('policy-acceptance-content'));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
    await waitFor(() => expect(screen.getByTestId('accepted-service')).toBeTruthy());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(accepted).toHaveBeenCalledTimes(1);
    expect(loadPolicy).toHaveBeenCalledTimes(1);
  });

});


describe('서로 다른 공통·서비스 약관', () => {
  const account = { ...PENDING[0], serviceKey: 'neture', policyDocumentId: 'account-doc', title: 'Neture 계정 약관' };
  function renderBoth(second: typeof DOC | null) {
    const onAccept = vi.fn(async () => ({ success: true }));
    render(<MemoryRouter><PolicyAcceptanceGate pending={[account, ...PENDING]}
      loadPolicy={async key => key === 'neture' ? { ...DOC, id: account.policyDocumentId, serviceKey: 'neture', content: '공통 계정 본문' } : second}
      onAccept={onAccept} onLogout={() => {}}><span>서비스</span></PolicyAcceptanceGate></MemoryRouter>);
    return onAccept;
  }
  it('두 본문을 모두 표시한 다음에만 전체 승낙을 제출한다', async () => {
    const accept = renderBoth({ ...DOC, content: '약국 서비스 본문' });
    await waitFor(() => expect(screen.getAllByTestId('policy-acceptance-content')).toHaveLength(2));
    expect(screen.getByText('공통 계정 본문')).toBeTruthy();
    expect(screen.getByText('약국 서비스 본문')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
  });
  it.each([null, { ...DOC, id: 'unreviewed' }, { ...DOC, version: 2 }])('두 번째 문서 누락·교체·버전 변경 시 일괄 승낙을 막는다', async doc => {
    const accept = renderBoth(doc);
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true));
    await waitFor(() => expect(screen.getByText(doc ? /약관이 갱신되었습니다/ : /게시된 약관을 찾을 수 없습니다/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }));
    expect(accept).not.toHaveBeenCalled();
  });
});


it('일부 승낙 후 pending 목록이 줄어도 이전 본문 인덱스로 접근하지 않는다', async () => {
  const second = { ...PENDING[0], policyDocumentId: 'neture-doc', serviceKey: 'neture', title: '계정 약관' };
  const load = async (key: string) => key === 'neture' ? { ...DOC, ...second, id: second.policyDocumentId } : DOC;
  const props = { loadPolicy: load, onAccept: async () => ({ success: true }), onLogout: () => {} };
  const view = render(<MemoryRouter><PolicyAcceptanceGate {...props} pending={[...PENDING, second]}><span>서비스</span></PolicyAcceptanceGate></MemoryRouter>);
  await waitFor(() => expect(screen.getAllByTestId('policy-acceptance-content')).toHaveLength(2));
  view.rerender(<MemoryRouter><PolicyAcceptanceGate {...props} pending={[second]}><span>서비스</span></PolicyAcceptanceGate></MemoryRouter>);
  await waitFor(() => expect(screen.getAllByTestId('policy-acceptance-content')).toHaveLength(1));
  expect(screen.getByRole('dialog').textContent).toContain('계정 약관');
});


describe('문서 소유 서비스와 전문 링크의 일치', () => {
  it.each([{ keys: ['neture', 'supplier', 'community', 'funding'] }, { keys: ['supplier'] }])('%j: Neture 전문 링크를 다른 서비스 본문에 재사용하지 않는다', async ({ keys }) => {
    const pending = keys.map(serviceKey => ({ ...PENDING[0], serviceKey, policyDocumentId: `${serviceKey}-doc`, title: `${serviceKey} terms` }));
    render(<MemoryRouter><PolicyAcceptanceGate pending={pending}
      loadPolicy={async serviceKey => ({ ...DOC, serviceKey, id: `${serviceKey}-doc`, title: `${serviceKey} terms`, content: `${serviceKey} body` })}
      termsPath="/terms" termsServiceKey="neture" onAccept={async () => ({ success: true })} onLogout={() => {}}><span>app</span></PolicyAcceptanceGate></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByTestId('policy-acceptance-content')).toHaveLength(keys.length));
    const links = screen.queryAllByRole('link', { name: /전문 새 탭에서 보기/ });
    expect(links).toHaveLength(keys.includes('neture') ? 1 : 0);
    if (links.length) expect(links[0].getAttribute('href')).toBe('https://neture.co.kr/terms');
    for (const key of keys) expect(screen.getByText(`${key} body`)).toBeTruthy();
  });
});
