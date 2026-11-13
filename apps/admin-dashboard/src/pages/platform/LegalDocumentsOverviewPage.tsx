/**
 * 약관·정책 문서 통합 현황 — admin.neture.co.kr 전체 관리자
 *
 * TODO-O4O-LEGAL-BASIC-DOCUMENTS-ADMIN-V1 4단계(5단계 퇴역 표시 포함).
 * 계정 공통 · 직영 서비스 문서는 업무 운영의 「법정정보·약관」(공통 편집기)로 이동해 편집한다.
 * 약국 협력사업 문서는 조회만 한다 — 편집은 해당 사업 관리자(사업 운영 화면).
 * 시행일은 편집기의 「시행일」에서 관리자가 정하고, 그 날짜 이후 게시할 수 있다.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { ActionBar } from '@o4o/ui';

type Tier = 'account' | 'service' | 'business' | 'other';
interface DocRow {
  documentType: string;
  slug: string | null;
  title: string;
  published: { version: number; effectiveDate: string | null; publishedAt: string | null; acceptances: number } | null;
  pendingDraft: { version: number; effectiveDate: string | null } | null;
}
export interface LegalScope { serviceKey: string; tier: Tier; label: string; note: string | null; editPath: string | null; documents: DocRow[] }

const TIERS: { tier: Tier; title: string; help: string }[] = [
  { tier: 'account', title: '① 계정 공통', help: '모든 회원이 가입할 때 동의하는 계정 이용약관 · 개인정보 처리방침.' },
  { tier: 'service', title: '② 직영 서비스별 추가 약관', help: '공급자 · 커뮤니티 · 펀딩 · 강의 · Partner 신청 · 참여 때 추가로 적용.' },
  { tier: 'business', title: '③ 약국 협력사업별 약관', help: '사업마다 참여 조건이 달라 사업 단위로 둔다. 편집은 해당 사업 관리자.' },
  { tier: 'other', title: '기타 · 퇴역', help: '동의 증빙 보존 대상. 새 문서를 만들지 않는다.' },
];
const TYPE_LABEL: Record<string, string> = {
  terms: '이용약관', privacy: '개인정보 처리방침/안내', marketing: '마케팅 정보 수신', store_owner_agreement: '매장 경영자 동의서',
  refund: '환불정책', commerce: '전자상거래 안내', seller: '판매자 안내', community: '커뮤니티 운영정책', location: '위치기반 서비스', custom: '기타',
};

/** O4O 표준 리스트(AGENTS.md §3-1) 선택 키 — 범위 · 문서 종류 · 표식이 같으면 같은 행이다. */
const rowKey = (s: LegalScope, d: DocRow) => `${s.serviceKey}|${d.documentType}|${d.slug ?? ''}`;

function nextVersionLabel(draft: DocRow['pendingDraft']): string {
  if (!draft) return '-';
  const when = draft.effectiveDate ? '시행 예정 ' + draft.effectiveDate : '시행일 미정';
  return `v${draft.version} 초안 · ${when}`;
}

export default function LegalDocumentsOverviewPage() {
  const [scopes, setScopes] = useState<LegalScope[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    authClient.api.get('/admin/legal-documents/overview')
      .then((r: { data: { data: LegalScope[] } }) => { if (alive) { setScopes(r.data.data ?? []); setSelected(new Set()); } })
      .catch(() => { if (alive) setError('약관·정책 문서 현황을 불러오지 못했습니다. 다시 시도해 주시기 바랍니다.'); });
    return () => { alive = false; };
  }, []);

  // 선택한 행이 속한 범위. 편집은 한 건만 선택했고 그 범위에 편집 경로가 있을 때만 연다(약국 협력사업은 조회 전용).
  const selectedScopes = useMemo(() => (scopes ?? []).filter((s) => s.documents.some((d) => selected.has(rowKey(s, d)))), [scopes, selected]);
  const single = selected.size === 1 ? selectedScopes[0] : undefined;
  const toggle = (key: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleScope = (s: LegalScope) => setSelected((prev) => {
    const keys = s.documents.map((d) => rowKey(s, d));
    const next = new Set(prev);
    const all = keys.every((k) => next.has(k));
    keys.forEach((k) => (all ? next.delete(k) : next.add(k)));
    return next;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900">약관·정책 문서</h1>
      <p className="mt-1 text-sm text-slate-500">
        게시된 문서는 덮어쓰지 않고 새 버전으로 고칩니다. 시행일은 편집 화면에서 정하고, 그 날짜 이후에 게시할 수 있습니다.
        약관 새 버전이 게시되면 회원은 다음 로그인 때 다시 동의합니다.
      </p>
      {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!scopes && !error && <p className="mt-6 text-sm text-slate-500">불러오는 중…</p>}
      {scopes && (
        <div className="sticky top-0 z-10 mt-4">
          <ActionBar selectedCount={selected.size} onClearSelection={() => setSelected(new Set())}
            statusInfo={single && !single.editPath ? '이 문서는 해당 사업 관리자가 사업 운영 화면에서 편집합니다.' : undefined}
            actions={[{ key: 'edit', label: '편집 화면 열기', variant: 'primary',
              disabled: !single?.editPath,
              tooltip: selected.size > 1 ? '편집은 한 건만 선택했을 때 열 수 있습니다.' : undefined,
              onClick: () => { if (single?.editPath) navigate(single.editPath); } }]} />
        </div>
      )}
      {scopes && TIERS.map(({ tier, title, help }) => {
        const list = scopes.filter((s) => s.tier === tier);
        if (!list.length && tier === 'other') return null;
        return (
          <section key={tier} className="mt-8" aria-label={title}>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mb-3 text-xs text-slate-500">{help}</p>
            {!list.length && <p className="text-sm text-slate-500">등록된 문서가 없습니다.</p>}
            {list.map((s) => (
              <div key={s.serviceKey} className="mb-4 rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
                  <div>
                    <span className="font-medium text-slate-800">{s.label}</span>
                    {s.note && <span className="ml-2 text-xs text-slate-500">{s.note}</span>}
                  </div>
                  {s.editPath && <Link to={s.editPath} className="text-sm text-blue-700">편집</Link>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="w-10 px-4 py-2">
                          <input type="checkbox" aria-label={`${s.label} 전체 선택`} disabled={!s.documents.length}
                            checked={s.documents.length > 0 && s.documents.every((d) => selected.has(rowKey(s, d)))}
                            onChange={() => toggleScope(s)} />
                        </th>
                        <th className="px-4 py-2">문서</th><th className="px-4 py-2">표식</th><th className="px-4 py-2">게시본</th><th className="px-4 py-2">시행일</th><th className="px-4 py-2">동의</th><th className="px-4 py-2">다음 버전</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.documents.map((d) => (
                        <tr key={rowKey(s, d)} className="border-t border-slate-100">
                          <td className="px-4 py-2">
                            <input type="checkbox" aria-label={`${s.label} ${TYPE_LABEL[d.documentType] ?? d.documentType} 선택`}
                              checked={selected.has(rowKey(s, d))} onChange={() => toggle(rowKey(s, d))} />
                          </td>
                          <td className="px-4 py-2">{TYPE_LABEL[d.documentType] ?? d.documentType}<div className="text-xs text-slate-500">{d.title}</div></td>
                          <td className="px-4 py-2 text-xs text-slate-600">{d.slug ?? '없음'}</td>
                          <td className="px-4 py-2">{d.published ? `v${d.published.version}` : '미게시'}</td>
                          <td className="px-4 py-2">{d.published?.effectiveDate ?? '-'}</td>
                          <td className="px-4 py-2">{d.published ? `${d.published.acceptances}건` : '-'}</td>
                          <td className="px-4 py-2">{nextVersionLabel(d.pendingDraft)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
