/**
 * 원내 약품 안내 — 병동 PC 공용·무로그인 (게이트1 = 옵션 C)
 *
 * WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 세우는가
 *
 * 이 화면이 O4OHomePage 와 갈라지는 지점 하나를 못박는다: **미인증/세션 만료(401)
 * 에서 로그인 모달을 열거나 이동하지 않는다.** 대신 "재연결 필요" 를 보여준다.
 * 그래서 mock 은 화면이 의존하는 세 경계(useWorkScope · sendUnifiedRequest ·
 * probeLocalAgent)에만 두고, 화면의 분기·문구는 실제 코드가 하게 둔다.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const sendUnifiedRequest = vi.fn();
const probeLocalAgent = vi.fn();

// UnifiedRequestError 는 실제 클래스를 그대로 쓴다(status 401 판정이 실제 코드 경로다).
vi.mock('../../lib/ai/unified-request', async () => {
  const actual = await vi.importActual<typeof import('../../lib/ai/unified-request')>(
    '../../lib/ai/unified-request',
  );
  return { ...actual, sendUnifiedRequest: (...args: unknown[]) => sendUnifiedRequest(...args) };
});

vi.mock('../../api/localAgent', async () => {
  const actual = await vi.importActual<typeof import('../../api/localAgent')>('../../api/localAgent');
  return { ...actual, probeLocalAgent: (...args: unknown[]) => probeLocalAgent(...args) };
});

// 병동 진입점은 공개 축(home) scope 로 성립한다 — 미인증에서도 resolved.
vi.mock('../../contexts', () => ({
  useWorkScope: () => ({
    workScope: {
      serviceKey: 'neture',
      workspace: 'home',
      capabilities: ['navigate', 'read'],
      executionMode: 'cloud',
      status: 'resolved',
    },
    isResolvingStore: false,
    lastResolvedWorkspace: null,
  }),
}));

import HospitalDrugPage from '../HospitalDrugPage';
import { UnifiedRequestError } from '../../lib/ai/unified-request';

afterEach(() => {
  cleanup();
  sendUnifiedRequest.mockReset();
  probeLocalAgent.mockReset();
});

const chatResult = (message: string) => ({ kind: 'chat', route: 'chat', reason: 'ok', chat: { message } });
const compositeResult = (message: string) => ({
  kind: 'composite',
  route: 'composite',
  reason: 'hospital_drug_composite',
  composite: {
    message,
    plan: 'web_and_local',
    steps: [
      { source: 'healthkr', tool: 'pharmacy.web.entrypoint', outcome: 'list:3' },
      { source: 'local_data', tool: 'data.local.query', outcome: 'rows:2' },
    ],
  },
});

describe('원내 약품 안내 — 게이트1 옵션 C', () => {
  it('미인증에서도 입력창이 열리고 로그인 UI 를 두지 않는다', async () => {
    probeLocalAgent.mockResolvedValue({ ok: true, health: { agentVersion: '0.1.0', connected: true, nonce: 'n' } });
    render(<HospitalDrugPage />);

    expect(await screen.findByTestId('hospital-drug-input')).toBeTruthy();
    // 로그인/회원가입 진입이 없어야 한다.
    expect(screen.queryByText('로그인')).toBeNull();
    expect(screen.queryByText('회원가입')).toBeNull();
  });

  it('정상 응답이면 답을 보여준다', async () => {
    probeLocalAgent.mockResolvedValue({ ok: true, health: { agentVersion: '0.1.0', connected: true, nonce: 'n' } });
    sendUnifiedRequest.mockResolvedValue(chatResult('타이레놀정 재고 12개, 단가 90원입니다.'));
    render(<HospitalDrugPage />);

    await userEvent.type(await screen.findByTestId('hospital-drug-input'), '타이레놀정 재고');
    await userEvent.click(screen.getByTestId('hospital-drug-submit'));

    const answer = await screen.findByTestId('hospital-drug-answer');
    expect(answer.textContent).toContain('타이레놀정 재고 12개');
  });

  it('결합 응답(§9 composite)이면 이미 합쳐진 하나의 답을 그대로 보여준다', async () => {
    probeLocalAgent.mockResolvedValue({ ok: true, health: { agentVersion: '0.1.0', connected: true, nonce: 'n' } });
    sendUnifiedRequest.mockResolvedValue(
      compositeResult("'우루사정' 과(와) 같은 성분(우르소데옥시콜산)의 원내 약품을 조회했습니다.\n\n[원내 약품] 2건 확인"),
    );
    render(<HospitalDrugPage />);

    await userEvent.type(await screen.findByTestId('hospital-drug-input'), '우루사정 200mg과 같은 성분의 원내약 있어?');
    await userEvent.click(screen.getByTestId('hospital-drug-submit'));

    const answer = await screen.findByTestId('hospital-drug-answer');
    expect(answer.textContent).toContain('우르소데옥시콜산');
    expect(answer.textContent).toContain('[원내 약품] 2건 확인');
  });

  it('401(세션 만료)이면 로그인으로 보내지 않고 「재연결 필요」를 안내한다', async () => {
    probeLocalAgent.mockResolvedValue({ ok: true, health: { agentVersion: '0.1.0', connected: true, nonce: 'n' } });
    sendUnifiedRequest.mockRejectedValue(new UnifiedRequestError('unauthorized', 'UNAUTHORIZED', 401));
    render(<HospitalDrugPage />);

    await userEvent.type(await screen.findByTestId('hospital-drug-input'), '아무 질문');
    await userEvent.click(screen.getByTestId('hospital-drug-submit'));

    const reconnect = await screen.findByTestId('hospital-drug-reconnect');
    expect(reconnect.textContent).toContain('재연결');
    // 일반 오류 박스로 새지 않았다.
    expect(screen.queryByTestId('hospital-drug-error')).toBeNull();
  });

  it('Agent 미연결이면 상태 배지가 「원내 자료 미연결」을 보여준다', async () => {
    probeLocalAgent.mockResolvedValue({ ok: false, reason: 'AGENT_NOT_RUNNING', permission: 'granted' });
    render(<HospitalDrugPage />);

    await waitFor(() => {
      expect(screen.getByTestId('hospital-drug-agent-status').textContent).toContain('원내 자료 미연결');
    });
  });

  it('바탕화면 추가 안내(§11)를 펼칠 수 있다', async () => {
    probeLocalAgent.mockResolvedValue({ ok: true, health: { agentVersion: '0.1.0', connected: true, nonce: 'n' } });
    render(<HospitalDrugPage />);

    await userEvent.click(await screen.findByTestId('hospital-drug-help-toggle'));
    const help = await screen.findByTestId('hospital-drug-help');
    expect(help.textContent).toContain('neture.co.kr/hospital-drug');
  });

  it('이 화면 전용 manifest(표시명·start_url)를 head 에 끼운다(§11)', async () => {
    probeLocalAgent.mockResolvedValue({ ok: true, health: { agentVersion: '0.1.0', connected: true, nonce: 'n' } });
    // jsdom 은 createObjectURL 이 없다 — 실제 브라우저 동작을 흉내만 낸다.
    const createObjectURL = vi.fn(() => 'blob:ward-manifest');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));

    const { unmount } = render(<HospitalDrugPage />);
    await screen.findByTestId('hospital-drug-input');

    const link = document.head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.href).toContain('blob:ward-manifest');
    expect(createObjectURL).toHaveBeenCalled();

    unmount();
    // 화면을 떠나면 원상복구된다 — 사이트 전역에 남지 않는다.
    expect(document.head.querySelector('link[rel="manifest"]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
