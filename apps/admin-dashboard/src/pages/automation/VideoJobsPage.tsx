/**
 * 자동화 › 동영상 제작 — 작업 목록 (WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1)
 *
 * 관리자 파일럿. 여러 VIDEO 작업을 독립 상태로 유지하는 "임시 작업 슬롯" 목록이다.
 * 영상 편집기가 아니다 — 새 작업 / 진행 중 / 완료 세 가지만 보여준다.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import {
  createJob,
  listJobs,
  JOB_STATUS_LABEL,
  type AutomationJobListItem,
  type JobStatus,
} from '@/api/automation-job.api';

const OPEN: JobStatus[] = ['DRAFT', 'IN_PROGRESS', 'WAITING'];

export const statusBadgeClass = (status: JobStatus) =>
  ({
    DRAFT: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    WAITING: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-slate-100 text-slate-400',
  })[status];

const VideoJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<AutomationJobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await listJobs());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createJob({ title: title.trim(), instructions: instructions.trim() || undefined });
      toast.success('작업을 만들었습니다.');
      setTitle('');
      setInstructions('');
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const visible = jobs.filter((j) => (tab === 'open' ? OPEN.includes(j.status) : !OPEN.includes(j.status)));
  const openCount = jobs.filter((j) => OPEN.includes(j.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-8 py-6">
        <div className="mb-1 text-xs text-gray-400">자동화</div>
        <h1 className="text-2xl font-normal mb-1">동영상 제작</h1>
        <p className="text-sm text-gray-500 mb-5">
          동영상 제작 작업의 상태·지시·제작 자료 연결만 관리하는 임시 작업공간입니다. 실제 생성·편집·렌더링은 외부 도구에서
          수행합니다. 완성 영상은 Media Library 에 보관하지 않고 임시 저장 후 다운로드하며, 보관 기간이 지나면 자동 삭제됩니다.
        </p>

        <form onSubmit={handleCreate} className="bg-white border rounded p-4 mb-4">
          <div className="text-sm font-medium mb-2">새 작업</div>
          <div className="flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="작업 제목 (예: 미네락600 제품 설명영상)"
              maxLength={200}
              className="flex-1 min-w-[240px] px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? '생성 중…' : '작업 만들기'}
            </button>
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="작업 지시 / 메모 (선택) — 길이, 언어, 톤, 참고 자료 등"
            rows={2}
            className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </form>

        <div className="flex gap-1 mb-3">
          {(
            [
              ['open', `진행 중 (${openCount})`],
              ['done', `완료 (${jobs.length - openCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-sm rounded border ${
                tab === key ? 'bg-white border-gray-300 font-medium' : 'border-transparent text-gray-500 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium">작업</th>
                <th className="px-3 py-3 text-left text-sm font-medium">상태</th>
                <th className="px-3 py-3 text-left text-sm font-medium">제작 자료 (입력 / 작업)</th>
                <th className="px-3 py-3 text-left text-sm font-medium">완성 영상</th>
                <th className="px-3 py-3 text-left text-sm font-medium">수정일</th>
              </tr>
            </thead>
            <tbody>
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                    {tab === 'open' ? '진행 중인 작업이 없습니다.' : '완료된 작업이 없습니다.'}
                  </td>
                </tr>
              ) : (
                visible.map((j) => (
                  <tr key={j.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <Link to={`/automation/video-jobs/${j.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                        {j.title}
                      </Link>
                      {j.instructions && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[420px]">{j.instructions}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${statusBadgeClass(j.status)}`}>
                        {JOB_STATUS_LABEL[j.status]}
                      </span>
                      {j.statusNote && <div className="text-xs text-gray-500 mt-1">{j.statusNote}</div>}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {j.assetCounts.INPUT} / {j.assetCounts.INTERMEDIATE}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {j.tempOutput.state === 'AVAILABLE' ? (
                        <span className="text-green-700">다운로드 가능 · 만료 {formatDate(j.tempOutput.expiresAt ?? '')}</span>
                      ) : j.tempOutput.state === 'EXPIRED' ? (
                        <span className="text-gray-400">만료됨</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{formatDate(j.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VideoJobsPage;
