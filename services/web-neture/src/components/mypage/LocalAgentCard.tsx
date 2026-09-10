/**
 * LocalAgentCard — [ 이 PC 연결 ] (§5)
 *
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
 * WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1 (원인별 안내 · 다시 연결)
 *
 * 카드 하나다. 대형 설정 화면을 만들지 않는다 — 사용자가 여기서 할 수 있는 일은
 * "이 PC 를 연결한다" 하나뿐이고, 그 하나를 위해 화면을 새로 만들 이유가 없다.
 *
 * 상태는 네 가지다.
 *
 *   확인 중        — health 조회
 *   연결 가능      — [ 이 PC 연결 ] 버튼
 *   이 PC 연결됨   — 완료 표시
 *   연결 불가      — 원인별 안내 + [ 다시 연결 ]
 *
 * 마지막 상태가 이 파일의 핵심이다. agent 미실행 · 브라우저 권한 미허용 · 그 밖의
 * 연결 실패는 사용자가 **해야 할 일이 서로 다르므로** 한 문구로 뭉뚱그리지 않는다.
 * 원인 판정 자체는 `api/localAgent` 의 순수 함수 한 곳에만 있다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  connectThisPc,
  describeConnectFailure,
  describeLocalAgentUnavailable,
  probeLocalAgent,
  type LocalAgentHealth,
} from '../../api/localAgent';

type Status = 'checking' | 'unavailable' | 'ready' | 'pairing' | 'connected';

export default function LocalAgentCard() {
  const [status, setStatus] = useState<Status>('checking');
  const [health, setHealth] = useState<LocalAgentHealth | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** 승인권을 받아 agent 에게 건넨다. 성공하면 완료, 실패하면 이유를 문장으로 보여준다. */
  const pair = useCallback(async (target: LocalAgentHealth) => {
    setStatus('pairing');
    setMessage(null);

    const outcome = await connectThisPc(target);
    if (!outcome.ok) {
      // nonce 는 1회용이다. 실패한 nonce 를 들고 다시 누르게 두지 않는다.
      setHealth(null);
      setStatus('unavailable');
      setMessage(describeConnectFailure(outcome.code));
      return;
    }
    setStatus('connected');
    setMessage(
      outcome.status === 'already_connected'
        ? '이 PC 는 이미 연결되어 있습니다.'
        : '이 PC 가 연결되었습니다.',
    );
  }, []);

  /**
   * 지금 상태를 다시 관측한다.
   *
   * `autoPair` 는 [ 다시 연결 ] 전용이다. 사용자가 브라우저 권한을 허용하거나 agent 를
   * 켠 뒤 누르는 버튼이므로, 연결까지 한 번에 이어 준다 — 두 번 누르게 하지 않는다.
   */
  const refresh = useCallback(
    async (autoPair = false) => {
      setStatus('checking');
      setMessage(null);
      setHealth(null);

      const probe = await probeLocalAgent();
      if (!probe.ok) {
        setStatus('unavailable');
        setMessage(describeLocalAgentUnavailable(probe.reason));
        return;
      }

      setHealth(probe.health);
      if (probe.health.connected) {
        setStatus('connected');
        return;
      }
      if (autoPair) {
        await pair(probe.health);
        return;
      }
      setStatus('ready');
    },
    [pair],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleConnect = useCallback(() => {
    if (!health) return;
    void pair(health);
  }, [health, pair]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">이 PC 연결</h3>
          <p className="mt-1 text-sm text-gray-600">
            이 PC 에서 실행 중인 Local Work Agent 를 현재 계정에 연결합니다. 입력할 코드는 없습니다.
          </p>

          <div className="mt-4">
            {status === 'checking' && (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Local Work Agent 를 확인하는 중입니다...
              </p>
            )}

            {status === 'unavailable' && message && (
              <p className="flex items-start gap-2 text-sm text-gray-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                {message}
              </p>
            )}

            {status === 'connected' && (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                이 PC 연결됨
              </p>
            )}

            {(status === 'ready' || status === 'pairing') && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={status === 'pairing'}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'pairing' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {status === 'pairing' ? 'Local Agent 연결 중...' : '이 PC 연결'}
              </button>
            )}
          </div>

          {status === 'connected' && message && (
            <p className="mt-3 text-sm text-gray-600">{message}</p>
          )}

          {status === 'unavailable' && (
            <button
              type="button"
              onClick={() => void refresh(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              다시 연결
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
