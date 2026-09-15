/**
 * 뒤로가기(bfcache 복원) 후 서비스 버튼 이동 중 상태 해제
 * WO-O4O-NETURE-HOME-BACK-NAVIGATION-BUSY-STATE-FIX-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 무엇을 세우는가
 * - 서비스 버튼 클릭 → handoff 발급 → `window.location.assign` 로 이동. busyId 는 남는다(정상).
 * - 브라우저가 페이지를 bfcache 에서 복원하면 `pageshow(persisted=true)` 가 오고,
 *   그 시점에 모래시계 · 전 버튼 disabled 가 풀려야 한다 — 새로고침 없이 같은/다른 서비스 재이동 가능.
 * - 복원 이전에 시작된 발급 요청이 늦게 도착해도 다시 이동시키지 않는다.
 * - 최초 로드 · 새로고침의 `pageshow(persisted=false)` 는 아무것도 바꾸지 않는다.
 * - 이동 실패 시 오류 안내 + 버튼 재활성(기존 동작 유지).
 *
 * mock 은 브라우저 경계 둘(`api.post` · `window.location.assign`)에만 둔다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const apiPost = vi.fn();
const apiGet = vi.fn();
vi.mock('../../../lib/apiClient', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
  },
  API_BASE_URL: 'https://api.neture.co.kr',
}));

import HomeEntryPanel from '../HomeEntryPanel';
import type { HomeEntryData } from '../../../lib/home-entry';
import type { User } from '../../../contexts/AuthContext';

const user: User = {
  id: 'u1',
  email: 'u1@example.test',
  name: '검증 사용자',
  roles: ['user'] as User['roles'],
};

type EntryService = HomeEntryData['services'][number];

const service = (key: string, nameKo: string, domain: string): EntryService =>
  ({
    key,
    name: key,
    nameKo,
    domain,
    basePath: '/',
    description: '',
    joinEnabled: true,
    membership: { status: 'active' },
  }) as unknown as EntryService;

/** kpa-society · pharmacy-hub 둘 다 active → 「주요 업무」 커뮤니티 handoff 버튼 2개 */
const data = {
  services: [
    service('neture', 'Neture', 'neture.co.kr'),
    service('kpa-society', 'KPA Society', 'kpa-society.co.kr'),
    service('pharmacy-hub', 'PharmacyHub', 'pharmacy-hub.co.kr'),
  ],
  stores: [],
  branches: [],
} as unknown as HomeEntryData;

const KPA = 'KPA Society 커뮤니티';
const PH = 'PharmacyHub 커뮤니티';

function handoffButton(label: string) {
  return screen.getByRole('button', { name: label }) as HTMLButtonElement;
}

/** bfcache 복원 신호. jsdom 에 PageTransitionEvent 가 없을 수 있어 Event 에 persisted 를 얹는다. */
function firePageShow(persisted: boolean) {
  const ev = new Event('pageshow');
  Object.defineProperty(ev, 'persisted', { value: persisted });
  act(() => {
    window.dispatchEvent(ev);
  });
}

let assign: ReturnType<typeof vi.fn>;
const originalLocation = window.location;

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, assign },
  });
  apiPost.mockReset();
  apiGet.mockReset();
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

function renderPanel() {
  return render(
    <MemoryRouter>
      <HomeEntryPanel user={user} data={data} loading={false} error={null} onReload={() => {}} />
    </MemoryRouter>,
  );
}

const resolved = (url: string) => Promise.resolve({ data: { success: true, data: { targetUrl: url } } });

describe('HomeEntryPanel — 뒤로가기(bfcache) 후 이동 중 상태 해제', () => {
  it('이동 성공 후 busy 가 남고, pageshow(persisted) 에서 풀려 같은 서비스로 재이동할 수 있다', async () => {
    apiPost.mockImplementation(() => resolved('https://kpa-society.co.kr/?h=1'));
    renderPanel();

    await userEvent.click(handoffButton(KPA));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://kpa-society.co.kr/?h=1'));
    // 이동 직전 상태: 모든 handoff 버튼 disabled (bfcache 는 이 상태 그대로 복원한다)
    expect(handoffButton(KPA).disabled).toBe(true);
    expect(handoffButton(PH).disabled).toBe(true);

    firePageShow(true);
    expect(handoffButton(KPA).disabled).toBe(false);
    expect(handoffButton(PH).disabled).toBe(false);

    apiPost.mockImplementation(() => resolved('https://kpa-society.co.kr/?h=2'));
    await userEvent.click(handoffButton(KPA));
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith('https://kpa-society.co.kr/?h=2'));
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenLastCalledWith('/auth/handoff', { targetServiceKey: 'kpa-society', returnPath: '/' });
  });

  it('복원 후 다른 서비스로도 이동할 수 있다 (반복 왕복)', async () => {
    apiPost.mockImplementation((_p: string, body: { targetServiceKey: string }) =>
      resolved(`https://${body.targetServiceKey}.test/`),
    );
    renderPanel();

    await userEvent.click(handoffButton(KPA));
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith('https://kpa-society.test/'));
    firePageShow(true);

    await userEvent.click(handoffButton(PH));
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith('https://pharmacy-hub.test/'));
    firePageShow(true);

    await userEvent.click(handoffButton(KPA));
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith('https://kpa-society.test/'));
    expect(assign).toHaveBeenCalledTimes(3);
  });

  it('복원 이전에 시작된 발급 응답이 늦게 도착해도 재이동하지 않고, 새 클릭은 정상 이동한다', async () => {
    let releaseLate!: (v: unknown) => void;
    apiPost.mockImplementationOnce(() => new Promise((r) => (releaseLate = r)));
    renderPanel();

    await userEvent.click(handoffButton(KPA));
    expect(handoffButton(PH).disabled).toBe(true);

    firePageShow(true); // 응답이 오기 전에 복원됨
    expect(handoffButton(KPA).disabled).toBe(false);

    await act(async () => {
      releaseLate({ data: { success: true, data: { targetUrl: 'https://kpa-society.test/stale' } } });
      await Promise.resolve();
    });
    expect(assign).not.toHaveBeenCalled();
    expect(handoffButton(KPA).disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();

    apiPost.mockImplementationOnce(() => resolved('https://pharmacy-hub.test/fresh'));
    await userEvent.click(handoffButton(PH));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(assign).toHaveBeenCalledWith('https://pharmacy-hub.test/fresh');
  });

  it('복원 이전에 시작된 요청이 늦게 실패해도 오류 안내를 띄우지 않는다', async () => {
    let rejectLate!: (e: unknown) => void;
    apiPost.mockImplementationOnce(() => new Promise((_r, rej) => (rejectLate = rej)));
    renderPanel();

    await userEvent.click(handoffButton(KPA));
    firePageShow(true);
    await act(async () => {
      rejectLate({ response: { data: { code: 'HANDOFF_NOT_ALLOWED' } } });
      await Promise.resolve();
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(handoffButton(KPA).disabled).toBe(false);
  });

  it('pageshow(persisted=false) — 최초 로드 · 새로고침 — 는 이동 중 상태를 건드리지 않는다', async () => {
    let release!: (v: unknown) => void;
    apiPost.mockImplementationOnce(() => new Promise((r) => (release = r)));
    renderPanel();

    await userEvent.click(handoffButton(KPA));
    firePageShow(false);
    expect(handoffButton(KPA).disabled).toBe(true);

    await act(async () => {
      release({ data: { success: true, data: { targetUrl: 'https://kpa-society.test/' } } });
      await Promise.resolve();
    });
    expect(assign).toHaveBeenCalledWith('https://kpa-society.test/');
  });

  it('이동 실패 시 오류 안내 후 버튼이 다시 활성화되고 재시도할 수 있다 (기존 동작 유지)', async () => {
    apiPost.mockImplementationOnce(() => Promise.reject({ response: { data: { code: 'SERVICE_UNAVAILABLE' } } }));
    renderPanel();

    await userEvent.click(handoffButton(KPA));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(assign).not.toHaveBeenCalled();
    expect(handoffButton(KPA).disabled).toBe(false);

    apiPost.mockImplementationOnce(() => resolved('https://kpa-society.test/retry'));
    await userEvent.click(handoffButton(KPA));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://kpa-society.test/retry'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('이동 중 중복 클릭은 발급을 한 번만 요청한다', async () => {
    let release!: (v: unknown) => void;
    apiPost.mockImplementationOnce(() => new Promise((r) => (release = r)));
    renderPanel();

    const btn = handoffButton(KPA);
    await userEvent.click(btn);
    // disabled 버튼은 userEvent 가 클릭을 막는다. 핸들러 가드까지 보려고 DOM 이벤트를 직접 보낸다.
    act(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ data: { success: true, data: { targetUrl: 'https://kpa-society.test/' } } });
      await Promise.resolve();
    });
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('언마운트 시 pageshow 리스너를 해제한다', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderPanel();
    const added = add.mock.calls.filter(([type]) => type === 'pageshow');
    expect(added).toHaveLength(1);
    unmount();
    const removed = remove.mock.calls.filter(([type]) => type === 'pageshow');
    expect(removed).toHaveLength(1);
    expect(removed[0][1]).toBe(added[0][1]);
    add.mockRestore();
    remove.mockRestore();
  });
});
