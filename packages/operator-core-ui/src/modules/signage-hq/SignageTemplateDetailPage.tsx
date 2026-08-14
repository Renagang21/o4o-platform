/**
 * SignageTemplateDetailPage — 운영자 사이니지 템플릿 상세/편집 (공통 콘솔)
 *
 * WO-O4O-SIGNAGE-CONSOLE-V1 (원본)
 * WO-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1:
 *   window.confirm(템플릿 삭제) → ConfirmActionDialog(danger)
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1:
 *   KPA/K-Cosmetics 중복을 단일 콘솔로 수렴.
 *
 * API: GET   /api/signage/:serviceKey/templates/:id
 *      GET   /api/signage/:serviceKey/templates/:id/zones
 *      PATCH /api/signage/:serviceKey/templates/:id
 *      DEL   /api/signage/:serviceKey/templates/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LayoutTemplate, Pencil, Save, X, Trash2 } from 'lucide-react';
import { ConfirmActionDialog } from '@o4o/ui';
import { SIGNAGE_STATUS_CONFIG, type SignageHqDetailPageProps } from './types';

interface TemplateLayoutConfig {
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait';
}

interface TemplateDetail {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  isPublic: boolean;
  isSystem?: boolean;
  layoutConfig?: TemplateLayoutConfig | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ZoneItem {
  id: string;
  name: string;
  zoneType: string;
  zoneKey?: string | null;
  zIndex?: number;
  isActive?: boolean;
  sortOrder: number;
  position?: { width?: number; height?: number; unit?: string } | null;
}

const zoneTypeLabel: Record<string, string> = {
  media: '미디어', text: '텍스트', clock: '시계', weather: '날씨', ticker: '티커', custom: '커스텀',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

export function SignageTemplateDetailPage({ id: templateId, apiFetch, config, navigate }: SignageHqDetailPageProps) {
  const { serviceKey, accent, routeBase } = config;
  const listPath = `${routeBase}/templates`;

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editOrientation, setEditOrientation] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  const unwrap = (r: any) => r?.data ?? r;

  const loadData = useCallback(async () => {
    if (!templateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [tplRes, zoneRes] = await Promise.all([
        apiFetch(`/api/signage/${serviceKey}/templates/${templateId}`),
        apiFetch(`/api/signage/${serviceKey}/templates/${templateId}/zones`),
      ]);
      setTemplate(unwrap(tplRes));
      const zoneData = unwrap(zoneRes);
      setZones(Array.isArray(zoneData) ? zoneData : (zoneData?.items ?? zoneData?.zones ?? []));
    } catch (err: any) {
      setError(err?.message || '템플릿을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, apiFetch, serviceKey]);

  useEffect(() => { void loadData(); }, [loadData]);

  const enterEditMode = () => {
    if (!template) return;
    setEditName(template.name);
    setEditDescription(template.description || '');
    setEditWidth(String(template.layoutConfig?.width || ''));
    setEditHeight(String(template.layoutConfig?.height || ''));
    setEditOrientation(template.layoutConfig?.orientation || 'landscape');
    setEditStatus(template.status);
    setEditIsPublic(template.isPublic);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const patchTemplate = useCallback(async (payload: Record<string, unknown>) => {
    const res = await apiFetch(`/api/signage/${serviceKey}/templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return unwrap(res) as TemplateDetail;
  }, [apiFetch, serviceKey, templateId]);

  const handleSave = async () => {
    if (!templateId || !template || !editName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (editName.trim() !== template.name) payload.name = editName.trim();
      if ((editDescription || '') !== (template.description || '')) payload.description = editDescription;
      if (editStatus !== template.status) payload.status = editStatus;
      if (editIsPublic !== template.isPublic) payload.isPublic = editIsPublic;

      const w = Number(editWidth);
      const h = Number(editHeight);
      const lc = template.layoutConfig;
      if (
        (w > 0 && w !== lc?.width) ||
        (h > 0 && h !== lc?.height) ||
        (editOrientation && editOrientation !== lc?.orientation)
      ) {
        payload.layoutConfig = {
          width: w > 0 ? w : lc?.width,
          height: h > 0 ? h : lc?.height,
          orientation: editOrientation || lc?.orientation,
        };
      }

      const updated = await patchTemplate(payload);
      setTemplate(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || '템플릿 수정에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'inactive') => {
    if (!templateId || !template || template.status === newStatus) return;
    setError(null);
    try {
      const updated = await patchTemplate({ status: newStatus });
      setTemplate(updated);
    } catch (err: any) {
      setError(err?.message || '상태 변경에 실패했습니다');
    }
  };

  const confirmDelete = async () => {
    if (!templateId) return;
    setError(null);
    setIsDeleting(true);
    try {
      await apiFetch(`/api/signage/${serviceKey}/templates/${templateId}`, { method: 'DELETE' });
      navigate(listPath);
    } catch (err: any) {
      setError(err?.message || '템플릿 삭제에 실패했습니다');
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className={`w-8 h-8 border-2 ${accent.spinnerBorder} border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(listPath)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> 템플릿 목록
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '템플릿을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  if (!template) return null;

  const sc = SIGNAGE_STATUS_CONFIG[template.status] || { text: template.status, cls: 'bg-slate-100 text-slate-500' };
  const inputCls = `w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(listPath)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> 템플릿 목록
      </button>

      {/* Header + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutTemplate className={`w-6 h-6 ${accent.icon}`} />
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? '템플릿 편집' : template.name}</h1>
          {!isEditing && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 ${accent.primaryButton} text-white rounded-lg text-sm disabled:opacity-50`}
              >
                <Save className="w-4 h-4" /> {isSaving ? '저장 중...' : '저장'}
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                <X className="w-4 h-4" /> 취소
              </button>
            </>
          ) : (
            <>
              <button onClick={enterEditMode} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                <Pencil className="w-4 h-4" /> 수정
              </button>
              <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> 삭제
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Status Quick Toggle (read mode only) */}
      {!isEditing && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">상태:</span>
          {(['draft', 'active', 'inactive'] as const).map((s) => {
            const cfg = SIGNAGE_STATUS_CONFIG[s];
            const isCurrent = template.status === s;
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isCurrent ? `${cfg.cls} ring-2 ring-offset-1 ${accent.statusRing}` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {cfg.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Template Info */}
      <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">템플릿 정보</h2>
        {isEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">공개 여부</label>
                <select value={editIsPublic ? 'true' : 'false'} onChange={(e) => setEditIsPublic(e.target.value === 'true')} className={inputCls}>
                  <option value="false">비공개</option>
                  <option value="true">공개</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">상태</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={inputCls}>
                  <option value="draft">초안</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">너비 (px)</label>
                <input type="number" value={editWidth} onChange={(e) => setEditWidth(e.target.value)} min={1} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">높이 (px)</label>
                <input type="number" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} min={1} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">방향</label>
                <select value={editOrientation} onChange={(e) => setEditOrientation(e.target.value)} className={inputCls}>
                  <option value="landscape">가로 (Landscape)</option>
                  <option value="portrait">세로 (Portrait)</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">설명</label>
              <textarea
                value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                placeholder="템플릿 설명" className={`${inputCls} resize-none`}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
              <InfoRow label="이름" value={template.name} />
              <InfoRow label="공개 여부" value={template.isPublic ? '공개' : '비공개'} />
              <InfoRow label="시스템 템플릿" value={template.isSystem ? '예' : '아니오'} />
              {template.layoutConfig?.width && <InfoRow label="너비" value={`${template.layoutConfig.width}px`} />}
              {template.layoutConfig?.height && <InfoRow label="높이" value={`${template.layoutConfig.height}px`} />}
              {template.layoutConfig?.orientation && (
                <InfoRow label="방향" value={template.layoutConfig.orientation === 'landscape' ? '가로' : '세로'} />
              )}
              <InfoRow label="생성일" value={formatDate(template.createdAt)} />
              <InfoRow label="수정일" value={formatDate(template.updatedAt)} />
            </div>
            {template.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">설명</p>
                <p className="text-sm text-slate-700">{template.description}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Zones (read-only) */}
      <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Zone 목록 <span className="text-sm font-normal text-slate-400">({zones.length})</span>
        </h2>
        {zones.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 Zone이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {[...zones].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((zone) => (
              <div key={zone.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{zone.name}</p>
                  <p className="text-xs text-slate-400">
                    {zoneTypeLabel[zone.zoneType] || zone.zoneType}
                    {zone.zoneKey && <span className="font-mono ml-2">({zone.zoneKey})</span>}
                    {zone.position && <span className="ml-2">· {zone.position.width}x{zone.position.height}{zone.position.unit || 'px'}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">z-index: {zone.zIndex}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${zone.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                    {zone.isActive ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {template.thumbnailUrl && (
        <div className={`bg-white rounded-xl border ${accent.cardBorder} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <img src={template.thumbnailUrl} alt={template.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}

      <ConfirmActionDialog
        open={deleteOpen}
        title="템플릿 삭제"
        message="이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        variant="danger"
        confirmText="삭제"
        loading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
