/**
 * MyEducationPage — 회원 본인의 연수교육 평점 조회
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * 조회 전용이다. 회원이 자기 인정평점을 올리는 경로는 없다 —
 * 평점은 분회가 확인해 기록하는 사실이다 (WO §4).
 * 강좌 목록·수강신청 진입점도 두지 않는다 (§10 범위 밖).
 */
import { useEffect, useState } from 'react';
import {
  listMyEducationCredits,
  EDUCATION_STATUS_LABEL,
  EXEMPTION_TYPE_LABEL,
  type EducationCreditItem,
  type EducationStatus,
} from '../../lib/api/educationCredit';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_CLASS: Record<EducationStatus, string> = {
  incomplete: 'bg-red-50 text-red-700',
  complete: 'bg-green-50 text-green-700',
  exempt: 'bg-gray-100 text-gray-600',
};

function credit(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function MyEducationPage({ slug }: { slug: string }) {
  const [items, setItems] = useState<EducationCreditItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    listMyEducationCredits(slug)
      .then((rows) => alive && setItems(rows))
      .catch((e) => {
        if (!alive) return;
        setItems(null);
        setError(describe(e));
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">연수교육</h1>
        <p className="mt-1 text-sm text-gray-500">
          분회가 확인한 연도별 연수교육 평점입니다. 정정이 필요하면 분회 사무국으로 문의해 주세요.
        </p>
      </header>

      {error && <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {items === null && !error ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          아직 등록된 연수교육 기록이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {(items ?? []).map((row) => (
            <div key={row.id} className="rounded border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">{row.year}년도</span>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.status]}`}
                >
                  {row.status === 'exempt' && row.exemptionType
                    ? EXEMPTION_TYPE_LABEL[row.exemptionType]
                    : EDUCATION_STATUS_LABEL[row.status]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">의무평점</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{credit(row.requiredCredits)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">인정평점</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{credit(row.completedCredits)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">남은 평점</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{credit(row.remainingCredits)}</dd>
                </div>
              </dl>
              {row.memo && <p className="mt-3 text-xs text-gray-500">{row.memo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
