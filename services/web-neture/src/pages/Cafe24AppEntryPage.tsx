/**
 * Cafe24AppEntryPage — Cafe24 Developers 의 App URL 진입점 (neture.co.kr/cafe24)
 *
 * WO-O4O-CAFE24-APP-ENTRY-ROUTE-V1
 *
 * 이 화면의 역할은 하나다: Cafe24 앱이 실행됐을 때 404 가 아니라 현재 상태를 보여주는 것.
 * Pilot 단계이므로 dashboard 를 만들지 않는다.
 *
 * 보안 경계 (WO §3·§4):
 *   - Cafe24 가 붙여 보내는 query parameter 는 **검증되지 않은 입력**이다.
 *     mall_id/shop_no 를 화면 표시와 authorize 요청의 prefill 로만 쓰고,
 *     권한 근거로 삼지 않는다. 실제 권한은 서버(admin guard)가 판정한다.
 *   - 여기서 organization/supplier/serviceKey 소유권을 결정하지 않는다.
 */

import { useCallback, useMemo, useState } from 'react';
import { Store, ExternalLink, ShieldAlert, Loader2, Info } from 'lucide-react';
import { api } from '../lib/apiClient';

/** Cafe24 는 앱 실행 시 mall 식별값을 query 로 붙인다. 표기 흔들림에 대비해 둘 다 읽는다. */
function readLaunchParams(search: string): { mallId: string | null; shopNo: string | null } {
  const q = new URLSearchParams(search);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = q.get(k);
      if (v && v.trim()) return v.trim();
    }
    return null;
  };
  return {
    mallId: pick('mall_id', 'mallId'),
    shopNo: pick('shop_no', 'shopNo'),
  };
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; title: string; detail: string };

export default function Cafe24AppEntryPage() {
  const launch = useMemo(() => readLaunchParams(window.location.search), []);
  const [mallId, setMallId] = useState(launch.mallId ?? '');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const startConnect = useCallback(async () => {
    const trimmed = mallId.trim();
    if (!trimmed) {
      setStatus({ kind: 'error', title: 'mall_id 가 필요합니다', detail: 'Cafe24 쇼핑몰 ID 를 입력해 주세요.' });
      return;
    }
    setStatus({ kind: 'loading' });
    try {
      const res = await api.get('/admin/cafe24/authorize', { params: { mallId: trimmed } });
      const url = res.data?.data?.authorizeUrl;
      if (!url) {
        setStatus({ kind: 'error', title: '승인 URL 을 받지 못했습니다', detail: '잠시 후 다시 시도해 주세요.' });
        return;
      }
      // Cafe24 승인은 반드시 브라우저에서 진행된다 (Cafe24 OAuth 가이드).
      window.location.href = url;
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { code?: string } } }).response;
      if (res?.status === 401 || res?.status === 403) {
        setStatus({
          kind: 'error',
          title: 'O4O 관리자 로그인이 필요합니다',
          detail: '현재 Cafe24 연결은 O4O 관리자만 시작할 수 있습니다. neture.co.kr 에 관리자 계정으로 로그인한 뒤 다시 시도해 주세요.',
        });
        return;
      }
      if (res?.data?.code === 'CAFE24_CREDENTIALS_NOT_CONFIGURED') {
        setStatus({
          kind: 'error',
          title: 'Cafe24 앱 자격정보가 아직 설정되지 않았습니다',
          detail: '서버에 Cafe24 Client ID/Secret/Redirect URI 가 등록되면 연결을 시작할 수 있습니다.',
        });
        return;
      }
      setStatus({
        kind: 'error',
        title: '연결을 시작하지 못했습니다',
        detail: res?.data?.code ? `서버 응답: ${res.data.code}` : '잠시 후 다시 시도해 주세요.',
      });
    }
  }, [mallId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Cafe24 × O4O</h1>
              <p className="text-sm text-slate-500">쇼핑몰 연결 파일럿</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-700">
            Cafe24 쇼핑몰의 상품 정보를 O4O 표준 상품과 연결하기 위한 준비 단계입니다.
            주문·회원·결제·배송은 Cafe24 에 그대로 두고, O4O 는 상품 조회 권한만 사용합니다.
          </p>

          {(launch.mallId || launch.shopNo) && (
            <div className="mt-5 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                <Info className="w-3.5 h-3.5" />
                <span className="text-xs">Cafe24 가 전달한 값</span>
              </div>
              <dl className="space-y-0.5 text-slate-700">
                {launch.mallId && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 w-16">mall_id</dt>
                    <dd className="font-mono">{launch.mallId}</dd>
                  </div>
                )}
                {launch.shopNo && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 w-16">shop_no</dt>
                    <dd className="font-mono">{launch.shopNo}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="cafe24-mall-id" className="block text-sm font-medium text-slate-700 mb-1.5">
              Cafe24 쇼핑몰 ID
            </label>
            <input
              id="cafe24-mall-id"
              type="text"
              value={mallId}
              onChange={(e) => setMallId(e.target.value)}
              placeholder="예: myshop"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={startConnect}
            disabled={status.kind === 'loading'}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status.kind === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                연결 준비 중…
              </>
            ) : (
              <>
                연결 시작
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          {status.kind === 'error' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">{status.title}</p>
                  <p className="mt-1 text-sm text-amber-800 leading-relaxed">{status.detail}</p>
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            연결 시 사용하는 권한은 상품 조회(<span className="font-mono">mall.read_product</span>) 하나입니다.
            주문·회원·결제 권한은 요청하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
