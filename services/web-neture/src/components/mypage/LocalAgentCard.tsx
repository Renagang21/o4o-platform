/**
 * LocalAgentCard — [ 이 PC 연결 ] (§5)
 *
 * WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
 *
 * 카드 하나다. 대형 설정 화면을 만들지 않는다(§5) — 사용자가 여기서 할 수 있는 일은
 * "이 PC 를 연결한다" 하나뿐이고, 그 하나를 위해 화면을 새로 만들 이유가 없다.
 *
 * 상태는 네 가지다.
 *
 *   agent 미실행        — 실행 안내 (자동 설치는 하지 않는다, §14)
 *   연결 가능           — [ 이 PC 연결 ] 버튼
 *   이 PC 연결됨        — 완료 표시
 *   Local Agent 오프라인 — 서버는 이 계정의 PC 를 알고 있는데 지금은 응답이 없다
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  connectThisPc,
  describeConnectFailure,
  fetchLocalAgentDevices,
  probeLocalAgent,
  type LocalAgentHealth,
} from '../../api/localAgent';

type Status = 'checking' | 'absent' | 'offline' | 'ready' | 'pairing' | 'connected';

export default function LocalAgentCard() {
  const [status, setStatus] = useState<Status>('checking');
  const [health, setHealth] = useState<LocalAgentHealth | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('checking');
    setMessage(null);

    const probe = await probeLocalAgent();
    setHealth(probe);

    if (probe?.connected) {
      setStatus('connected');
      return;
    }
    if (probe) {
      setStatus('ready');
      return;
    }

    // agent 가 응답하지 않는다. 서버가 이 계정의 PC 를 알고 있는지에 따라 안내가 갈린다 —
    // "설치하지 않았다" 와 "켜 두지 않았다" 는 사용자가 할 일이 다르다.
    try {
      const devices = await fetchLocalAgentDevices();
      setStatus(devices.length > 0 ? 'offline' : 'absent');
    } catch {
      setStatus('absent');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleConnect = useCallback(async () => {
    if (!health) return;
    setStatus('pairing');
    setMessage(null);

    const outcome = await connectThisPc(health);
    if (!outcome.ok) {
      setMessage(describeConnectFailure(outcome.code));
      // 실패했으니 상태를 다시 관측한다. nonce 는 1회용이라 새로 받아야 한다.
      await refresh();
      return;
    }
    setStatus('connected');
    setMessage(
      outcome.status === 'already_connected'
        ? '이 PC 는 이미 연결되어 있습니다.'
        : '이 PC 가 연결되었습니다.',
    );
  }, [health, refresh]);

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

            {status === 'absent' && (
              <p className="flex items-start gap-2 text-sm text-gray-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Local Work Agent 가 실행되고 있지 않습니다. 먼저 Local Work Agent 를 실행해 주세요.
              </p>
            )}

            {status === 'offline' && (
              <p className="flex items-start gap-2 text-sm text-gray-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Local Agent 오프라인 — 연결된 PC 가 있지만 지금은 응답하지 않습니다. Local Work
                Agent 가 실행 중인지 확인해 주세요.
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

          {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}

          {(status === 'absent' || status === 'offline') && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 text-sm font-medium text-blue-600 hover:underline"
            >
              다시 확인
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
