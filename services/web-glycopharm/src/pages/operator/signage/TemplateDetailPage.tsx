/**
 * Signage Template Detail Page — Signage Console
 * WO-O4O-SIGNAGE-CONSOLE-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccessToken } from '@/contexts/AuthContext';
import { ArrowLeft, LayoutTemplate } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'glycopharm';

interface TemplateDetail {
  id: string;
  name: string;
  description: string | null;
  layoutConfig: { width?: number; height?: number; orientation?: string; backgroundColor?: string } | null;
  category: string | null;
  status: string;
  isPublic: boolean;
  isSystem: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ZoneData {
  id: string;
  name: string;
  zoneKey: string | null;
  zoneType: string;
  position: { x?: number; y?: number; width?: number; height?: number; unit?: string } | null;
  zIndex: number;
  sortOrder: number;
  isActive: boolean;
}

const zoneTypeLabel: Record<string, string> = {
  media: '미디어', text: '텍스트', clock: '시계', weather: '날씨', ticker: '티커', custom: '커스텀',
};

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(async (path: string) => {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [tData, zData] = await Promise.all([
          apiFetch(`/api/signage/${SERVICE_KEY}/templates/${templateId}`),
          apiFetch(`/api/signage/${SERVICE_KEY}/templates/${templateId}/zones`),
        ]);
        setTemplate(tData.data || tData.template || tData);
        setZones(zData.data || zData.zones || []);
      } catch (err: any) {
        setError(err?.message || '템플릿을 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [templateId, apiFetch]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('ko-KR'); } catch { return '-'; }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/admin/signage/templates')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> 템플릿 목록
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '템플릿을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/admin/signage/templates')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> 템플릿 목록
      </button>

      <div className="flex items-center gap-3">
        <LayoutTemplate className="w-6 h-6 text-slate-600" />
        <h1 className="text-2xl font-bold text-slate-800">{template.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${template.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {template.status === 'active' ? '활성' : template.status}
        </span>
      </div>

      {/* Template Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">템플릿 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="이름" value={template.name} />
          <InfoRow label="카테고리" value={template.category || '-'} />
          <InfoRow label="공개 여부" value={template.isPublic ? '공개' : '비공개'} />
          <InfoRow label="시스템 템플릿" value={template.isSystem ? '예' : '아니오'} />
          {template.layoutConfig?.width && <InfoRow label="너비" value={`${template.layoutConfig.width}px`} />}
          {template.layoutConfig?.height && <InfoRow label="높이" value={`${template.layoutConfig.height}px`} />}
          {template.layoutConfig?.orientation && <InfoRow label="방향" value={template.layoutConfig.orientation} />}
          <InfoRow label="생성일" value={formatDate(template.createdAt)} />
          <InfoRow label="수정일" value={formatDate(template.updatedAt)} />
        </div>
        {template.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">설명</p>
            <p className="text-sm text-slate-700">{template.description}</p>
          </div>
        )}
      </div>

      {/* Zones */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Zone 목록 <span className="text-sm font-normal text-slate-400">({zones.length})</span>
        </h2>
        {zones.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 Zone이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {zones.sort((a, b) => a.sortOrder - b.sortOrder).map(zone => (
              <div key={zone.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{zone.name}</p>
                  <p className="text-xs text-slate-400">
                    {zoneTypeLabel[zone.zoneType] || zone.zoneType}
                    {zone.zoneKey && <span className="font-mono ml-2">({zone.zoneKey})</span>}
                    {zone.position && <span className="ml-2">· {zone.position.width}×{zone.position.height}{zone.position.unit || 'px'}</span>}
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
        <div className="bg-white rounded-xl border border-slate-100 p-6">
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
