/**
 * Local Network Access 안내 UX — WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1 §12
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library 를 그대로 쓴다.
 * 이 서비스에 테스트 의존성을 추가하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 세우는가
 *
 * 이 테스트는 카드를 **진짜로 렌더링한다.** 판정 함수만 따로 부르지 않는 이유는,
 * 이 WO 가 고치려는 결함이 판정 로직이 아니라 "사용자가 읽는 문장" 이기 때문이다.
 * 그래서 mock 은 브라우저 경계 두 개(`fetch` · `navigator.permissions`)에만 두고,
 * 그 너머의 판정 · 문구 선택 · 재시도는 실제 코드가 하게 둔다.
 *
 * 세 상황을 구분하는 근거는 권한 상태 조회다. 이것은 상태를 **읽기만** 한다 —
 * 권한 대화상자를 열지도, 자동 승인하지도 않는다 (§3 · §6).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// apiClient 는 @o4o/auth-client 를 통해 실제 axios 인스턴스를 만든다. 이 테스트는
// 승인권 발급 결과만 필요하므로 그 경계를 여기서 끊는다.
const apiPost = vi.fn();
const apiGet = vi.fn();
vi.mock('../../../lib/apiClient', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
  },
  API_BASE_URL: 'https://api.neture.co.kr',
}));

import LocalAgentCard from '../LocalAgentCard';

/** §5 가 정한 세 문장 + §8 이 허용한 중립 문장. 문구는 여기서만 정의한다. */
const MESSAGE = {
  A_NOT_RUNNING: 'Local Work Agent가 실행되고 있지 않습니다.',
  B_PERMISSION: '브라우저에서 이 PC 연결 권한을 허용해 주세요.',
  C_GENERIC: '이 PC의 Local Work Agent에 연결할 수 없습니다.',
  NEUTRAL: 'Agent가 실행 중이 아니거나 브라우저 연결 권한이 필요합니다.',
};

/**
 * 브라우저 권한 상태를 그때그때 바꿔 끼운다.
 *
 * `null` 은 Permissions API 자체가 없는 브라우저다 — 그때는 원인을 알 수 없고,
 * 알 수 없다는 사실이 그대로 문구에 반영돼야 한다.
 */
function setPermission(state: 'granted' | 'prompt' | 'denied' | null) {
  const permissions =
    state === null ? undefined : { query: vi.fn().mockResolvedValue({ state }) };
  Object.defineProperty(navigator, 'permissions', {
    value: permissions,
    configurable: true,
    writable: true,
  });
}

const HEALTH_BODY = { ok: true, agentVersion: '0.1.0', connected: false, nonce: 'nonce-1' };

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

/** LNA 권한이 없을 때 Chrome 이 실제로 던지는 것 — 연결 시도 없이 즉시 TypeError. */
const failedToFetch = () => Promise.reject(new TypeError('Failed to fetch'));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  apiPost.mockResolvedValue({ data: { data: { grant: 'grant-1' } } });
  apiGet.mockResolvedValue({ data: { data: [] } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('§12 LNA 안내 UX', () => {
  it('1. agent 실행 + 권한 허용 → 연결된다', async () => {
    setPermission('granted');
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/health')
          ? jsonResponse(HEALTH_BODY)
          : jsonResponse({ ok: true, status: 'connected' }),
      ),
    );

    render(<LocalAgentCard />);
    await userEvent.click(await screen.findByRole('button', { name: '이 PC 연결' }));

    expect(await screen.findByText('이 PC 연결됨')).toBeTruthy();
    expect(screen.getByText('이 PC 가 연결되었습니다.')).toBeTruthy();
  });

  it('2. agent 미실행(권한은 허용됨) → Agent 실행 안내가 나온다', async () => {
    setPermission('granted');
    fetchMock.mockImplementation(failedToFetch);

    render(<LocalAgentCard />);

    expect(await screen.findByText(new RegExp(MESSAGE.A_NOT_RUNNING))).toBeTruthy();
    // 같은 TypeError 인데도 권한 문구로 새지 않는다 — 이 구분이 이 WO 의 전부다.
    expect(screen.queryByText(new RegExp(MESSAGE.B_PERMISSION))).toBeNull();
  });

  it('3. 권한 미허용 → 권한 허용 안내가 나온다 (agent 는 켜져 있어도 마찬가지)', async () => {
    setPermission('prompt');
    fetchMock.mockImplementation(failedToFetch);

    render(<LocalAgentCard />);

    expect(await screen.findByText(new RegExp(MESSAGE.B_PERMISSION))).toBeTruthy();
    expect(screen.queryByText(new RegExp(MESSAGE.A_NOT_RUNNING))).toBeNull();
  });

  it('3-b. 권한 거부(denied) 도 같은 권한 안내로 간다', async () => {
    setPermission('denied');
    fetchMock.mockImplementation(failedToFetch);

    render(<LocalAgentCard />);

    expect(await screen.findByText(new RegExp(MESSAGE.B_PERMISSION))).toBeTruthy();
  });

  it('4. 권한을 허용한 뒤 [ 다시 연결 ] 을 누르면 연결까지 이어진다', async () => {
    setPermission('prompt');
    fetchMock.mockImplementation(failedToFetch);

    render(<LocalAgentCard />);
    expect(await screen.findByText(new RegExp(MESSAGE.B_PERMISSION))).toBeTruthy();

    // 사용자가 브라우저 대화상자에서 허용했다. O4O 는 이 전환에 관여하지 않는다.
    setPermission('granted');
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/health')
          ? jsonResponse(HEALTH_BODY)
          : jsonResponse({ ok: true, status: 'connected' }),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: '다시 연결' }));

    // 버튼 한 번으로 재관측 + 연결까지 끝난다 (§7).
    expect(await screen.findByText('이 PC 연결됨')).toBeTruthy();
  });

  it('5. 원인을 알 수 없는 localhost 실패 → 중립 안내로 두고 확정하지 않는다', async () => {
    setPermission(null); // Permissions API 가 없는 브라우저
    fetchMock.mockImplementation(failedToFetch);

    render(<LocalAgentCard />);

    expect(await screen.findByText(new RegExp(MESSAGE.NEUTRAL))).toBeTruthy();
    expect(screen.queryByText(new RegExp(MESSAGE.A_NOT_RUNNING))).toBeNull();
    expect(screen.queryByText(new RegExp(MESSAGE.B_PERMISSION))).toBeNull();
  });

  it('5-b. agent 가 응답은 했지만 정상 응답이 아니면 일반 연결 실패 안내다', async () => {
    setPermission('granted');
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ok: false }, 500)));

    render(<LocalAgentCard />);

    expect(await screen.findByText(new RegExp(MESSAGE.C_GENERIC))).toBeTruthy();
  });

  it('6. 이미 연결된 PC 는 그대로 연결됨으로 보인다 (기존 상태 회귀 0)', async () => {
    setPermission('granted');
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ ...HEALTH_BODY, connected: true })),
    );

    render(<LocalAgentCard />);

    expect(await screen.findByText('이 PC 연결됨')).toBeTruthy();
    // 이미 연결된 상태에서 승인권을 새로 발급하지 않는다.
    expect(apiPost).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '이 PC 연결' })).toBeNull();
  });

  it('실패해도 1회용 nonce 를 재사용하지 않는다 (replay 여지 0)', async () => {
    setPermission('granted');
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/health')
          ? jsonResponse(HEALTH_BODY)
          : jsonResponse({ ok: false, code: 'INVALID_PAIRING_GRANT' }, 400),
      ),
    );

    render(<LocalAgentCard />);
    await userEvent.click(await screen.findByRole('button', { name: '이 PC 연결' }));

    expect(await screen.findByText(/연결 승인 시간이 지났습니다/)).toBeTruthy();
    // 실패한 nonce 로 다시 누를 수 있는 버튼을 남기지 않는다. 남은 경로는 재관측뿐이다.
    expect(screen.queryByRole('button', { name: '이 PC 연결' })).toBeNull();
    expect(screen.getByRole('button', { name: '다시 연결' })).toBeTruthy();
  });
});

describe('보안 경계 — 이 카드가 하지 않는 일', () => {
  it('localhost 요청에 쿠키를 싣지 않고 고정 loopback 창구만 부른다', async () => {
    setPermission('granted');
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/health')
          ? jsonResponse(HEALTH_BODY)
          : jsonResponse({ ok: true, status: 'connected' }),
      ),
    );

    render(<LocalAgentCard />);
    await userEvent.click(await screen.findByRole('button', { name: '이 PC 연결' }));
    await screen.findByText('이 PC 연결됨');

    for (const [url, init] of fetchMock.mock.calls as Array<[string, RequestInit]>) {
      expect(String(url).startsWith('http://127.0.0.1:47821/')).toBe(true);
      expect(init.credentials).toBe('omit');
    }
  });

  it('권한 조회는 읽기만 한다 — 권한을 요청하는 API 를 부르지 않는다 (§6)', async () => {
    const query = vi.fn().mockResolvedValue({ state: 'prompt' });
    Object.defineProperty(navigator, 'permissions', {
      value: { query, request: vi.fn() },
      configurable: true,
      writable: true,
    });
    fetchMock.mockImplementation(failedToFetch);

    render(<LocalAgentCard />);
    await screen.findByText(new RegExp(MESSAGE.B_PERMISSION));

    expect(query).toHaveBeenCalledWith({ name: 'local-network-access' });
    expect(
      (navigator.permissions as unknown as { request: ReturnType<typeof vi.fn> }).request,
    ).not.toHaveBeenCalled();
  });
});

describe('안내 문구는 원인마다 다르다', () => {
  it('네 문구가 서로 겹치지 않는다', async () => {
    const values = Object.values(MESSAGE);
    expect(new Set(values).size).toBe(values.length);
    await waitFor(() => expect(values.every((v) => v.length > 0)).toBe(true));
  });
});
