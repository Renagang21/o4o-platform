/**
 * OperatorQrListPage — 운영자 매장 HUB QR 템플릿 목록
 *
 * WO-O4O-KPA-OPERATOR-QR-WRITE-PAGE-V1 (2026-05-24)
 *
 * 운영자가 KPA 매장 HUB 에 게시한 (또는 게시 예정인) QR 템플릿 목록.
 * 상태별 필터 + 신규 작성 / 수정 / 발행 / 보관 / 삭제 진입.
 *
 * Backend: WO-O4O-KPA-OPERATOR-QR-PUBLISHING-PHASE2-BACKEND-V1
 *   GET /api/v1/kpa/operator/qr/templates
 *
 * 권한 검증은 backend + RoleGuard 가 처리.
 *
 * 패턴: OperatorPopListPage mirror — 다만 QR 도메인 차이로:
 *   - slug 표시 안 함 (운영자 단계 미발급)
 *   - target_type / target 요약을 row meta 에 표시
 *
 * 본 페이지 범위: 운영자 QR "템플릿" 관리 (실제 QR 발급은 매장 가져가기 시 Phase 3-B 에서).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Loader2,
  AlertCircle,
  Edit3,
  Trash2,
  Send,
  Archive,
  Plus,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import {
  listOperatorQrTemplates,
  publishOperatorQrTemplate,
  archiveOperatorQrTemplate,
  deleteOperatorQrTemplate,
  type OperatorQrTemplate,
} from '../../../api/operatorQr';
import { toast } from '@o4o/error-handling';

type StatusFilter = '' | 'draft' | 'published' | 'archived';

const STATUS_LABEL: Record<OperatorQrTemplate['status'], string> = {
  draft: '초안',
  published: '발행',
  archived: '보관',
};

const STATUS_BADGE: Record<OperatorQrTemplate['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

const CONTENT_KIND_LABEL: Record<string, string> = {
  blog: '블로그',
  cms: 'CMS',
  pop: 'POP',
};

function formatTargetSummary(item: OperatorQrTemplate): string {
  if (item.targetType === 'url') {
    return item.targetUrl ? `URL · ${item.targetUrl}` : 'URL';
  }
  const kind = item.targetContentKind ? CONTENT_KIND_LABEL[item.targetContentKind] || item.targetContentKind : '';
  const ref = item.targetContentRef ? ` · ${item.targetContentRef}` : '';
  return `콘텐츠${kind ? ` · ${kind}` : ''}${ref}`;
}

export default function OperatorQrListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OperatorQrTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listOperatorQrTemplates({
        page,
        limit,
        status: statusFilter || undefined,
      });
      setItems(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e?.message || '목록을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" QR 템플릿을 발행하시겠습니까? 발행 즉시 매장 HUB 에 노출됩니다.`)) return;
    try {
      await publishOperatorQrTemplate(id);
      toast.success('QR 템플릿이 발행되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    }
  };

  const handleArchive = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" QR 템플릿을 보관하시겠습니까? HUB 노출이 중단됩니다.`)) return;
    try {
      await archiveOperatorQrTemplate(id);
      toast.success('QR 템플릿이 보관되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '보관에 실패했습니다');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" QR 템플릿을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    try {
      await deleteOperatorQrTemplate(id);
      toast.success('QR 템플릿이 삭제되었습니다');
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">매장 HUB QR-code</h1>
          <p className="text-sm text-slate-500 mt-1">
            운영자가 KPA 매장 HUB 에 게시할 QR "템플릿" 을 작성·관리합니다.
            실제 QR-code 는 매장 경영자가 가져갈 때 매장별로 발급됩니다.
            본 화면에서는 슬러그·통계가 없으며, 발행 후 매장 HUB 에 노출되어 매장이 자기 매장으로 가져갈 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/operator/qr/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />새 QR 템플릿
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(['', 'draft', 'published', 'archived'] as StatusFilter[]).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              statusFilter === s
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === '' ? '전체' : STATUS_LABEL[s as OperatorQrTemplate['status']]}
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <QrCode className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-400">
            {statusFilter ? '해당 상태의 QR 템플릿이 없습니다' : '아직 작성한 QR 템플릿이 없습니다'}
          </p>
          {!statusFilter && (
            <button
              onClick={() => navigate('/operator/qr/new')}
              className="text-sm text-blue-600 hover:underline"
            >
              첫 QR 템플릿 작성하기
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 hover:border-slate-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">
                      {item.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                    {item.targetType === 'url' ? (
                      <LinkIcon className="w-3 h-3" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    <span className="truncate">{formatTargetSummary(item)}</span>
                    <span>·</span>
                    <span>
                      {new Date(item.updatedAt).toLocaleDateString('ko-KR')} 수정
                    </span>
                    {item.publishedAt && (
                      <>
                        <span>·</span>
                        <span>
                          {new Date(item.publishedAt).toLocaleDateString('ko-KR')} 발행
                        </span>
                      </>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/operator/qr/${item.id}/edit`)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                    title="수정"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {item.status !== 'published' && (
                    <button
                      onClick={() => handlePublish(item.id, item.title)}
                      className="p-2 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600"
                      title="발행"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  {item.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(item.id, item.title)}
                      className="p-2 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600"
                      title="보관"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
