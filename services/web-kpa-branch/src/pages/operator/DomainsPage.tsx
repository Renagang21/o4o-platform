/**
 * DomainsPage — 분회 자체 도메인 연결 (운영자)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 흐름: 도메인 등록(pending) → DNS TXT 등록 → 검증 요청(verifying) → 서비스 관리자 활성화(active).
 * 활성화가 admin 전용인 이유는 실제 인프라(도메인 매핑·인증서) 작업을 수반하기 때문이다.
 * 분회별 별도 배포는 만들지 않는다 — active 도메인은 같은 번들이 Host 로 해석한다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  createDomain,
  listDomains,
  removeDomain,
  requestDomainVerification,
  type BranchDomain,
} from '../../lib/api/branch';
import { describeApiError } from '../../lib/errors';

const STATUS_LABEL: Record<BranchDomain['status'], string> = {
  pending: 'DNS 설정 대기',
  verifying: '검증 요청됨',
  active: '연결 완료',
  failed: '검증 실패',
  disabled: '해제됨',
};

export default function DomainsPage({ slug }: { slug: string }) {
  const [items, setItems] = useState<BranchDomain[] | null>(null);
  const [hostname, setHostname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await listDomains(slug));
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    }
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function add() {
    setBusy(true);
    try {
      await createDomain(slug, hostname.trim().toLowerCase());
      setHostname('');
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify(d: BranchDomain) {
    setBusy(true);
    try {
      await requestDomainVerification(slug, d.id);
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: BranchDomain) {
    if (!window.confirm(`${d.hostname} 연결을 삭제할까요?`)) return;
    setBusy(true);
    try {
      await removeDomain(slug, d.id);
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">자체 도메인 연결</h1>
      <p className="mt-1 text-sm text-gray-500">
        분회 도메인으로 접속해도 같은 홈페이지가 열립니다. 별도 배포는 필요하지 않습니다.
      </p>

      <div className="mt-6 flex gap-2 text-sm">
        <input
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          placeholder="예: gangnam-pharm.or.kr"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="button"
          disabled={busy || !hostname.trim()}
          onClick={() => void add()}
          className="rounded bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          등록
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-3">
        {(items ?? []).map((d) => (
          <li key={d.id} className="rounded border border-gray-200 p-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">{d.hostname}</span>
              {d.isPrimary && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs text-primary-700">대표</span>}
              <span className="ml-auto text-xs text-gray-500">{STATUS_LABEL[d.status]}</span>
            </div>

            {d.status !== 'active' && (
              <div className="mt-3 rounded bg-gray-50 p-3 text-xs text-gray-600">
                <p className="font-medium text-gray-700">DNS TXT 레코드를 추가한 뒤 검증을 요청하세요.</p>
                <p className="mt-1">이름: {d.verification.recordName}</p>
                <p>유형: {d.verification.recordType}</p>
                <p className="break-all">값: {d.verification.recordValue}</p>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {d.status !== 'active' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void verify(d)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700"
                >
                  검증 요청
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(d)}
                className="rounded border border-red-200 px-3 py-1 text-xs text-red-600"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items?.length === 0 && !error && <p className="mt-4 text-sm text-gray-500">연결된 도메인이 없습니다.</p>}
      {items === null && !error && <p className="mt-4 text-sm text-gray-500">불러오는 중입니다…</p>}
    </div>
  );
}
