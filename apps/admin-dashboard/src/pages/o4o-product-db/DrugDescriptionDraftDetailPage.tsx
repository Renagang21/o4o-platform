/**
 * DrugDescriptionDraftDetailPage — OTC 설명 초안 상세 (read-only)
 *
 * WO-O4O-ADMIN-O4O-DRUG-DESCRIPTION-DRAFT-REVIEW-SHELL-V1
 *
 * content_json(요약표/효능/복용·사용/주의/성분기준/bodyMarkdown) + seed_json(그룹 범위·근거) +
 * guard_result + anchor candidate 링크. mutation 없음(승인/반려/저장 버튼 없음).
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getDrugDescriptionDraft, DrugDescriptionDraftDetail } from '@/api/o4o-product-db.api';

export default function DrugDescriptionDraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<DrugDescriptionDraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getDrugDescriptionDraft(id)
      .then((d) => {
        if (!d) setError('설명 초안을 찾을 수 없습니다');
        setDraft(d);
      })
      .catch((e: any) => setError(e?.response?.data?.error || e?.message || '상세를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  const cj = (draft?.contentJson ?? {}) as Record<string, any>;
  const seed = (draft?.seedJson ?? {}) as Record<string, any>;
  const guard = (draft?.guardResult ?? {}) as Record<string, any>;
  const scope = (seed.groupScope ?? {}) as Record<string, any>;
  const summaryTable = (cj.summaryTable ?? {}) as Record<string, string>;

  return (
    <div>
      <button onClick={() => navigate('/admin/o4o-product-db/drug-description-drafts')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-admin-blue mb-4">
        <ArrowLeft className="w-4 h-4" /> 초안 목록으로
      </button>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
        read-only 상세입니다. 이 화면에서는 승인·반려·수정·공식 설명 승격을 하지 않습니다. 검수 결과 반영은 별도 승격 WO에서 진행됩니다.
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center">불러오는 중…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4">{error}</div>
      ) : draft ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{draft.title || draft.groupKey}</h2>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <Badge>{labelVerdict(String(guard.verdict ?? ''))}</Badge>
              <Badge>{labelStatus(draft.reviewStatus)}</Badge>
              <Badge>{draft.sourceLabel}</Badge>
              <Badge>{draft.language}</Badge>
              {(draft.reviewFlags ?? []).map((f) => <Badge key={f} muted>{f}</Badge>)}
            </div>
          </div>

          {/* 요약 정보 */}
          <Section title="요약 정보">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <Field label="groupKey" value={draft.groupKey} mono />
              <Field label="draft_type" value={draft.draftType} />
              <Field label="applyRunId" value={String(seed.applyRunId ?? '—')} mono />
              <Field label="SKU(master) 수" value={String(scope.masterTotal ?? '—')} />
              <Field label="OTC / RX" value={`${scope.otc ?? '—'} / ${scope.rx ?? 0}`} />
              <Field label="제조사 수" value={String(scope.manufacturers ?? '—')} />
              <Field label="e약은요 중복(spdMasters)" value={String(scope.spdMasters ?? '—')} />
              <Field label="e약은요 grounding" value={String(guard.groundingEasyDrug ?? '—')} />
              <Field label="RX purity" value={guard.rxPurity != null ? Number(guard.rxPurity).toFixed(3) : '—'} />
            </dl>
            <div className="mt-3 text-sm">
              <span className="text-gray-500">대표 anchor candidate: </span>
              <button
                onClick={() => navigate(`/admin/o4o-product-db/candidates/${draft.anchorCandidateId}`)}
                className="text-admin-blue underline underline-offset-2 font-mono text-xs"
              >
                {draft.anchorCandidateId} →
              </button>
            </div>
          </Section>

          {/* content_json */}
          <Section title="설명 초안 본문 (content_json)">
            {Object.keys(summaryTable).length > 0 && (
              <table className="text-sm border border-gray-200 rounded mb-4 w-full max-w-xl">
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(summaryTable).map(([k, v]) => (
                    <tr key={k}>
                      <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600 w-32 align-top">{k}</td>
                      <td className="px-3 py-2 text-gray-800">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Prose label="효능·효과" text={cj.efficacy} />
            <Prose label={cj.usageLabel || '복용 안내'} text={cj.usage} />
            <Prose label="주의 대상" text={cj.caution} />
            <Prose label="성분 기준 선택" text={cj.ingredientSelection} />
          </Section>

          {/* bodyMarkdown 원문 */}
          {cj.bodyMarkdown && (
            <Section title="원문 마크다운 (bodyMarkdown)">
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap text-gray-700">{String(cj.bodyMarkdown)}</pre>
            </Section>
          )}

          {/* seed_json / guard_result */}
          <Section title="근거 / guard (seed_json · guard_result)">
            <div className="grid md:grid-cols-2 gap-4">
              <JsonBlock title="seed_json" value={draft.seedJson} />
              <JsonBlock title="guard_result" value={draft.guardResult} />
            </div>
          </Section>

          <div className="text-xs text-gray-400">
            생성 {draft.createdAt?.slice(0, 19).replace('T', ' ')} · 수정 {draft.updatedAt?.slice(0, 19).replace('T', ' ')} · AI {draft.aiProvider ?? '없음(외부 초안)'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className={`text-gray-800 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value || '—'}</dd>
    </div>
  );
}
function Prose({ label, text }: { label: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{text}</p>
    </div>
  );
}
function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 mb-1">{title}</div>
      <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700 max-h-80">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
function Badge({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${muted ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>{children}</span>;
}

function labelVerdict(v: string): string {
  const m: Record<string, string> = {
    INSERT_auto: '자동', INSERT_review_flag: '약사검토강화', INSERT_low_ground_flag: '저 grounding',
    INSERT_rx_minor_flag: 'RX 소수혼입', INSERT_manual_flag: '수동큐레이션',
  };
  return m[v] ?? v ?? '—';
}
function labelStatus(v: string): string {
  const m: Record<string, string> = {
    needs_review: '검토 대기', approved: '승인', rejected: '반려', hidden: '숨김', deprecated: '폐기',
  };
  return m[v] ?? v;
}
