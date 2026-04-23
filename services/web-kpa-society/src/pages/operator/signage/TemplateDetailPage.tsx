/**
 * Signage Template Detail Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-SOCIETY-DIGITAL-SIGNAGE-TEMPLATE-CRUD-UI-V1: 편집/삭제/상태 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutTemplate, Pencil, Save, X, Trash2 } from 'lucide-react';
import {
  fetchTemplate,
  updateTemplate,
  deleteTemplate,
  fetchTemplateZones,
  type SignageTemplateItem,
  type UpdateTemplatePayload,
  type TemplateZoneItem,
} from '../../../api/signageTemplate';

const zoneTypeLabel: Record<string, string> = {
  media: '미디어', text: '텍스트', clock: '시계', weather: '날씨', ticker: '티커', custom: '커스텀',
};

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  inactive: { text: '비활성', cls: 'bg-amber-100 text-amber-600' },
};

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<SignageTemplateItem | null>(null);
  const [zones, setZones] = useState<TemplateZoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editOrientation, setEditOrientation] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  const loadData = useCallback(async () => {
    if (!templateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [tpl, zoneList] = await Promise.all([
        fetchTemplate(templateId),
        fetchTemplateZones(templateId),
      ]);
      setTemplate(tpl);
      setZones(zoneList);
    } catch (err: any) {
      setError(err?.message || '템플릿을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const handleSave = async () => {
    if (!templateId || !template || !editName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: UpdateTemplatePayload = {};
      if (editName.trim() !== template.name) payload.name = editName.trim();
      if ((editDescription || '') !== (template.description || '')) payload.description = editDescription;
      if (editStatus !== template.status) payload.status = editStatus as 'active' | 'inactive' | 'draft';
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
          orientation: (editOrientation || lc?.orientation) as 'landscape' | 'portrait',
        };
      }

      const updated = await updateTemplate(templateId, payload);
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
      const updated = await updateTemplate(templateId, { status: newStatus });
      setTemplate(updated);
    } catch (err: any) {
      setError(err?.message || '상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
    setError(null);
    try {
      await deleteTemplate(templateId);
      navigate('/operator/signage/templates');
    } catch (err: any) {
      setError(err?.message || '템플릿 삭제에 실패했습니다');
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/operator/signage/templates')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> 템플릿 목록
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '템플릿을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  if (!template) return null;

  const sc = statusConfig[template.status] || { text: template.status, cls: 'bg-slate-100 text-slate-500' };

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/operator/signage/templates')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> 템플릿 목록
      </button>

      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? '템플릿 편집' : template.name}</h1>
          {!isEditing && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} disabled={isSaving || !editName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
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
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">상태:</span>
          {(['draft', 'active', 'inactive'] as const).map(s => {
            const cfg = statusConfig[s];
            const isCurrent = template.status === s;
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isCurrent ? cfg.cls + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {cfg.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Template Info */}
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">템플릿 정보</h2>
        {isEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">공개 여부</label>
                <select value={editIsPublic ? 'true' : 'false'} onChange={e => setEditIsPublic(e.target.value === 'true')} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="false">비공개</option>
                  <option value="true">공개</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">상태</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="draft">초안</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">너비 (px)</label>
                <input type="number" value={editWidth} onChange={e => setEditWidth(e.target.value)} min={1} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">높이 (px)</label>
                <input type="number" value={editHeight} onChange={e => setEditHeight(e.target.value)} min={1} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">방향</label>
                <select value={editOrientation} onChange={e => setEditOrientation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="landscape">가로 (Landscape)</option>
                  <option value="portrait">세로 (Portrait)</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">설명</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} placeholder="템플릿 설명" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
              {template.layoutConfig?.orientation && <InfoRow label="방향" value={template.layoutConfig.orientation === 'landscape' ? '가로' : '세로'} />}
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
      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Zone 목록 <span className="text-sm font-normal text-slate-400">({zones.length})</span>
        </h2>
        {zones.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 Zone이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {[...zones].sort((a, b) => a.sortOrder - b.sortOrder).map(zone => (
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
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
          <img src={template.thumbnailUrl} alt={template.name} className="max-w-md rounded-lg border border-slate-200" />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
