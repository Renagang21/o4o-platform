/**
 * 자동화 › 동영상 제작 — 작업 상세 (WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1)
 *
 * 기본 정보 · 현재 상태 · 작업 지시/메모 · 입력/작업/최종 자료 · 완료 · 자료 정리.
 * 자료는 기존 Media Library(/platform/media-library) 검색으로 골라 연결만 한다. 영상 편집 UI 없음.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatDate, formatFileSize } from '@/lib/utils';
import { listMediaAssets, type MediaAssetAdmin } from '@/api/media-library.api';
import {
  applyCleanup,
  completeJob,
  getJob,
  linkAsset,
  previewCleanup,
  unlinkAsset,
  updateJob,
  CLEANUP_DECISIONS,
  CLEANUP_LABEL,
  CLEANUP_PLAN_LABEL,
  CLEANUP_REASON_LABEL,
  CLEANUP_RESULT_LABEL,
  JOB_STATUS_LABEL,
  PURPOSES,
  PURPOSE_LABEL,
  type AutomationJobDetail,
  type CleanupDecision,
  type CleanupItem,
  type JobAssetLink,
  type JobStatus,
  type Purpose,
} from '@/api/automation-job.api';
import { statusBadgeClass } from './VideoJobsPage';

const EDITABLE_STATUSES: JobStatus[] = ['DRAFT', 'IN_PROGRESS', 'WAITING', 'CANCELLED'];
const input = 'px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200';
const btn = 'px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50';
const btnPrimary = 'px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white border rounded p-4 mb-4">
    <h2 className="text-sm font-medium mb-3">{title}</h2>
    {children}
  </section>
);

const AssetRow: React.FC<{ asset: JobAssetLink['asset'] }> = ({ asset }) => (
  <div className="flex items-center gap-3 min-w-0">
    {asset.assetType === 'image' || asset.thumbnailUrl ? (
      <img src={asset.thumbnailUrl || asset.url} alt="" className="w-12 h-12 object-cover rounded border" loading="lazy" />
    ) : (
      <div className="w-12 h-12 rounded border bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
        {asset.assetType}
      </div>
    )}
    <div className="min-w-0">
      <div className="text-sm text-gray-800 truncate max-w-[320px]">{asset.title || asset.originalName}</div>
      <div className="text-[11px] text-gray-400">
        {asset.mimeType} · {formatFileSize(asset.fileSize)} ·{' '}
        <a href={asset.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          열기
        </a>
      </div>
    </div>
  </div>
);

const VideoJobDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [job, setJob] = useState<AutomationJobDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ title: '', status: 'DRAFT' as JobStatus, statusNote: '', instructions: '' });
  const [saving, setSaving] = useState(false);

  // asset picker
  const [pickPurpose, setPickPurpose] = useState<Purpose>('INPUT');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MediaAssetAdmin[]>([]);
  const [searching, setSearching] = useState(false);

  // complete / cleanup
  const [decision, setDecision] = useState<CleanupDecision>('DECIDE_LATER');
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<CleanupItem[] | null>(null);
  const [applied, setApplied] = useState<CleanupItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await getJob(id);
      setJob(j);
      setForm({ title: j.title, status: j.status, statusNote: j.statusNote ?? '', instructions: j.instructions ?? '' });
      if (j.cleanupDecision) setDecision(j.cleanupDecision);
    } catch (e) {
      if ((e as Error).message === 'JOB_NOT_FOUND') setNotFound(true);
      else toast.error((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const closed = job?.status === 'COMPLETED';
  const linkable = job && job.status !== 'COMPLETED' && job.status !== 'CANCELLED';

  const save = async (patch: Parameters<typeof updateJob>[1]) => {
    setSaving(true);
    try {
      await updateJob(id, patch);
      toast.success('저장했습니다.');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const search = async () => {
    setSearching(true);
    try {
      setResults((await listMediaAssets({ q, limit: 20 })).data);
    } catch {
      toast.error('미디어 자산 검색에 실패했습니다.');
    } finally {
      setSearching(false);
    }
  };
  const link = async (assetId: string) => {
    try {
      await linkAsset(id, assetId, pickPurpose);
      toast.success(`${PURPOSE_LABEL[pickPurpose]}로 연결했습니다.`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const unlink = async (linkId: string) => {
    if (!window.confirm('이 작업과의 연결만 해제합니다. 자산 자체는 삭제되지 않습니다.')) return;
    try {
      await unlinkAsset(id, linkId);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const complete = async () => {
    if (!window.confirm(`작업을 완료 처리합니다. (정리 방침: ${CLEANUP_LABEL[decision]})\n완료 후에는 기본 정보와 자료 연결을 수정할 수 없습니다.`)) return;
    setBusy(true);
    try {
      await completeJob(id, decision);
      toast.success('완료 처리했습니다.');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const doPreview = async () => {
    setBusy(true);
    setApplied(null);
    try {
      setPreview((await previewCleanup(id, decision, [...keep])).items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const doApply = async () => {
    const deleting = preview?.filter((i) => i.plan === 'DELETE').length ?? 0;
    if (!window.confirm(`정리를 실행합니다. 삭제 예정 ${deleting}건은 storage 와 DB 에서 제거됩니다. 계속할까요?`)) return;
    setBusy(true);
    try {
      const res = await applyCleanup(id, decision, [...keep]);
      setApplied(res.items);
      setPreview(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (notFound)
    return (
      <div className="px-8 py-6 text-sm text-gray-500">
        작업을 찾을 수 없습니다. <Link to="/automation/video-jobs" className="text-blue-600 hover:underline">목록으로</Link>
      </div>
    );
  if (!job) return <div className="px-8 py-6 text-sm text-gray-500">Loading…</div>;

  const byPurpose = (p: Purpose) => job.assets.filter((a) => a.purpose === p);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-8 py-6 max-w-5xl">
        <div className="mb-1 text-xs text-gray-400">
          <Link to="/automation/video-jobs" className="hover:underline">자동화 › 동영상 제작</Link>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-normal">{job.title}</h1>
          <span className={`inline-block px-2 py-0.5 text-xs rounded ${statusBadgeClass(job.status)}`}>{JOB_STATUS_LABEL[job.status]}</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          생성 {formatDate(job.createdAt)} · 수정 {formatDate(job.updatedAt)}
          {job.completedAt && ` · 완료 ${formatDate(job.completedAt)}`}
        </p>

        <Section title="기본 정보">
          <div className="flex gap-2">
            <input value={form.title} disabled={closed} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} flex-1`} />
            <button disabled={closed || saving || !form.title.trim()} onClick={() => save({ title: form.title.trim() })} className={btn}>제목 저장</button>
          </div>
        </Section>

        <Section title="현재 상태">
          <div className="flex flex-wrap gap-2">
            <select value={form.status} disabled={closed} onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })} className={input}>
              {EDITABLE_STATUSES.map((s) => (
                <option key={s} value={s}>{JOB_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <input
              value={form.statusNote}
              disabled={closed}
              maxLength={500}
              onChange={(e) => setForm({ ...form, statusNote: e.target.value })}
              placeholder="세부 단계 메모 (예: 내레이션 검수 대기)"
              className={`${input} flex-1 min-w-[240px]`}
            />
            <button disabled={closed || saving} onClick={() => save({ status: form.status, statusNote: form.statusNote || null })} className={btn}>상태 저장</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">완료는 아래 "완료" 섹션에서 처리합니다. 세부 제작 단계는 메모로 적습니다.</p>
        </Section>

        <Section title="작업 지시 / 메모">
          <textarea value={form.instructions} disabled={closed} rows={5} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className={`${input} w-full`} placeholder="외부 도구(Codex / Computer Use / 영상 AI)에 전달할 지시, 참고 사항" />
          <div className="mt-2 text-right">
            <button disabled={closed || saving} onClick={() => save({ instructions: form.instructions || null })} className={btn}>지시 저장</button>
          </div>
        </Section>

        {PURPOSES.map((p) => (
          <Section key={p} title={`${PURPOSE_LABEL[p]} (${byPurpose(p).length})`}>
            {byPurpose(p).length === 0 ? (
              <div className="text-xs text-gray-400">연결된 자료가 없습니다.</div>
            ) : (
              <ul className="divide-y">
                {byPurpose(p).map((l) => (
                  <li key={l.linkId} className="py-2 flex items-center justify-between gap-3">
                    <AssetRow asset={l.asset} />
                    {linkable && (
                      <button onClick={() => unlink(l.linkId)} className="text-xs text-gray-500 hover:text-red-600">연결 해제</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ))}

        {linkable && (
          <Section title="자료 연결 — Media Library 검색">
            <div className="flex flex-wrap gap-2 mb-2">
              <select value={pickPurpose} onChange={(e) => setPickPurpose(e.target.value as Purpose)} className={input}>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{PURPOSE_LABEL[p]}로 연결</option>
                ))}
              </select>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }} placeholder="제목·설명·메모·태그·키워드 검색…" className={`${input} flex-1 min-w-[240px]`} />
              <button onClick={search} disabled={searching} className={btnPrimary}>검색</button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              새 파일은 <Link to="/content-resource/media-assets" className="text-blue-600 hover:underline">Media Assets</Link>에서 먼저 등록한 뒤 여기서 연결합니다.
            </p>
            {results.length > 0 && (
              <ul className="divide-y border rounded">
                {results.map((a) => {
                  const existing = job.assets.find((l) => l.asset.id === a.id);
                  return (
                    <li key={a.id} className="px-3 py-2 flex items-center justify-between gap-3">
                      <AssetRow asset={{ ...a, fileSize: Number(a.fileSize) }} />
                      <div className="flex items-center gap-2">
                        {existing && <span className="text-[11px] text-gray-400">{PURPOSE_LABEL[existing.purpose]}로 연결됨</span>}
                        <button onClick={() => link(a.id)} className={btn}>{existing ? '용도 변경' : '연결'}</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        )}

        {!closed && (
          <Section title="완료">
            <div className="flex flex-wrap gap-2 items-center">
              <select value={decision} onChange={(e) => setDecision(e.target.value as CleanupDecision)} className={input}>
                {CLEANUP_DECISIONS.map((d) => (
                  <option key={d} value={d}>{CLEANUP_LABEL[d]}</option>
                ))}
              </select>
              <button onClick={complete} disabled={busy || job.status === 'CANCELLED'} className={btnPrimary}>완료 처리</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              완료 시 정리 방침만 저장됩니다. 실제 정리는 완료 후 "자료 정리"에서 미리보기를 확인하고 실행합니다.
              {job.status === 'CANCELLED' && ' 취소된 작업은 상태를 되돌린 뒤 완료할 수 있습니다.'}
            </p>
          </Section>
        )}

        {closed && (
          <Section title="자료 정리">
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <select value={decision} onChange={(e) => { setDecision(e.target.value as CleanupDecision); setPreview(null); }} className={input}>
                {CLEANUP_DECISIONS.map((d) => (
                  <option key={d} value={d}>{CLEANUP_LABEL[d]}</option>
                ))}
              </select>
              <button onClick={doPreview} disabled={busy} className={btn}>정리 대상 미리보기</button>
              {preview && preview.some((i) => i.plan !== 'KEEP') && (
                <button onClick={doApply} disabled={busy} className="px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50">정리 실행</button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              정리 후보는 작업 자료(INTERMEDIATE)뿐입니다. 입력 자료와 최종 결과, 다른 작업·상품·콘텐츠에 연결된 자산, 다른 자산의
              원본(lineage), 타블렛 콘텐츠에서 사용 중인 자산은 삭제하지 않고 이 작업과의 관계만 해제합니다. 자동 삭제는 없습니다.
            </p>
            {decision === 'KEEP_SELECTED' && (
              <div className="mb-3">
                <div className="text-xs font-medium mb-1">보관할 작업 자료 선택</div>
                {byPurpose('INTERMEDIATE').length === 0 ? (
                  <div className="text-xs text-gray-400">작업 자료가 없습니다.</div>
                ) : (
                  byPurpose('INTERMEDIATE').map((l) => (
                    <label key={l.linkId} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={keep.has(l.linkId)}
                        onChange={(e) => {
                          const next = new Set(keep);
                          if (e.target.checked) next.add(l.linkId); else next.delete(l.linkId);
                          setKeep(next);
                          setPreview(null);
                        }}
                      />
                      <span className="truncate">{l.asset.title || l.asset.originalName}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            {(preview || applied) && (
              <table className="w-full text-sm border-t">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2">자료</th>
                    <th className="py-2">구분</th>
                    <th className="py-2">{applied ? '결과' : '계획'}</th>
                    <th className="py-2">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {(applied ?? preview ?? []).map((i) => (
                    <tr key={i.linkId} className="border-t">
                      <td className="py-2"><AssetRow asset={i.asset} /></td>
                      <td className="py-2 text-xs">{PURPOSE_LABEL[i.purpose]}</td>
                      <td className="py-2 text-xs">
                        {i.result ? (
                          <span className={i.result === 'DELETED' ? 'text-red-600' : i.result === 'BLOCKED' || i.result === 'STORAGE_DELETE_FAILED' ? 'text-amber-600' : ''}>
                            {CLEANUP_RESULT_LABEL[i.result]}
                          </span>
                        ) : (
                          <span className={i.plan === 'DELETE' ? 'text-red-600' : ''}>{CLEANUP_PLAN_LABEL[i.plan]}</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-gray-500">{i.reason ? CLEANUP_REASON_LABEL[i.reason] : i.code ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        )}
      </div>
    </div>
  );
};

export default VideoJobDetailPage;
