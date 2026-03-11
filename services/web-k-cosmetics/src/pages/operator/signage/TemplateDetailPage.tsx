/**
 * Template Detail Page — Signage Template Detail & Zone List
 *
 * Cookie-based auth (K-Cosmetics)
 * API: GET /api/signage/k-cosmetics/templates/:id        (template detail)
 * API: GET /api/signage/k-cosmetics/templates/:id/zones  (template zones)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'k-cosmetics';

// ─── Types ───────────────────────────────────────────────────

interface TemplateDetail {
  id: string;
  name: string;
  category: string | null;
  isPublic: boolean;
  isSystem: boolean;
  status: string;
  layoutConfig: {
    width: number;
    height: number;
    orientation: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TemplateZone {
  id: string;
  name: string;
  zoneType: string;
  position: { x: number; y: number; width: number; height: number } | null;
  zIndex: number;
  isActive: boolean;
}

// ─── Labels ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'bg-slate-100 text-slate-700' },
  pending: { label: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { label: '활성', cls: 'bg-green-100 text-green-700' },
  archived: { label: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  media: '미디어',
  text: '텍스트',
  clock: '시계',
  weather: '날씨',
  ticker: '티커',
  custom: '커스텀',
};

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Component ───────────────────────────────────────────────

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [zones, setZones] = useState<TemplateZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [templateRes, zonesRes] = await Promise.all([
          apiFetch<{ success: boolean; data: TemplateDetail }>(
            `/api/signage/${SERVICE_KEY}/templates/${templateId}`
          ),
          apiFetch<{ success: boolean; data: TemplateZone[] }>(
            `/api/signage/${SERVICE_KEY}/templates/${templateId}/zones`
          ),
        ]);
        if (templateRes.success) {
          setTemplate(templateRes.data);
        }
        if (zonesRes.success) {
          setZones(zonesRes.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load template detail:', err);
        setError(err?.message || '템플릿 정보를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [templateId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const formatPosition = (pos: TemplateZone['position']) => {
    if (!pos) return '-';
    return `(${pos.x}, ${pos.y}) ${pos.width}x${pos.height}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">템플릿 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Error / not found state
  if (error && !template) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/operator/signage/templates')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          템플릿 목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '템플릿을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  if (!template) return null;

  const currentStatus = STATUS_CONFIG[template.status] || { label: template.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate('/operator/signage/templates')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          템플릿 목록으로
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{template.name}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.cls}`}>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Template Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">템플릿 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <InfoRow label="이름" value={template.name} />
          <InfoRow label="카테고리" value={template.category || '-'} />
          <InfoRow label="공개 여부" value={template.isPublic ? '공개' : '비공개'} />
          <InfoRow label="시스템 템플릿" value={template.isSystem ? '예' : '아니오'} />
          {template.layoutConfig && (
            <>
              <InfoRow label="가로 (px)" value={String(template.layoutConfig.width)} />
              <InfoRow label="세로 (px)" value={String(template.layoutConfig.height)} />
              <InfoRow label="방향" value={template.layoutConfig.orientation} />
            </>
          )}
          {!template.layoutConfig && (
            <InfoRow label="레이아웃 설정" value="-" />
          )}
          <InfoRow label="생성일" value={formatDate(template.createdAt)} />
          <InfoRow label="수정일" value={formatDate(template.updatedAt)} />
        </div>
      </div>

      {/* Zone List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">존 목록</h2>
          <p className="text-sm text-slate-500 mt-1">템플릿에 정의된 레이아웃 존</p>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">이름</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">타입</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">위치</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">z-Index</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">활성</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                  존이 없습니다
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{zone.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                      {ZONE_TYPE_LABELS[zone.zoneType] || zone.zoneType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                    {formatPosition(zone.position)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      {zone.zIndex}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {zone.isActive ? (
                      <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}
