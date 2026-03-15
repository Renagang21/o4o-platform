/**
 * TemplateDetailPage - 사이니지 템플릿 상세
 * 템플릿 상세 정보 및 영역(zone) 목록 (읽기 전용)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  Monitor,
  Grid3X3,
  ExternalLink,
} from 'lucide-react';
import { getAccessToken } from '../../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
const SERVICE_KEY = 'neture';

interface TemplateDetail {
  id: string;
  name: string;
  description?: string;
  width?: number;
  height?: number;
  orientation?: string;
  zoneCount?: number;
  status?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  backgroundColor?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

interface TemplateZone {
  id: string;
  name: string;
  zoneType?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  defaultMediaType?: string;
  description?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const zoneTypeLabels: Record<string, string> = {
  main: '메인',
  sidebar: '사이드바',
  ticker: '티커',
  logo: '로고',
  header: '헤더',
  footer: '푸터',
  overlay: '오버레이',
};

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [zones, setZones] = useState<TemplateZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    // WO-O4O-DASHBOARD-AUTH-API-NORMALIZE-V1: Bearer token for cross-domain
    const token = getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || body?.message || `API error ${res.status}`);
    }
    return res.json();
  }, []);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/signage/${SERVICE_KEY}/templates/${templateId}`);
      const templateData = data.data || null;
      setTemplate(templateData);
      setZones(templateData?.zones || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '템플릿을 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [templateId, apiFetch]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600">템플릿 로딩 중...</span>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/workspace/operator/signage/templates')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="mt-4 text-red-600">{error || '템플릿을 찾을 수 없습니다.'}</p>
          <button
            onClick={loadTemplate}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/workspace/operator/signage/templates')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
        <button
          onClick={loadTemplate}
          className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Title */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary-100 rounded-xl">
          <LayoutTemplate className="w-8 h-8 text-primary-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{template.name}</h1>
          {template.description && (
            <p className="text-slate-500 mt-1">{template.description}</p>
          )}
        </div>
        {template.status && (
          <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-primary-100 text-primary-600">
            {template.status}
          </span>
        )}
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">미리보기</h2>
        <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
          {template.thumbnailUrl || template.previewUrl ? (
            <img
              src={template.previewUrl || template.thumbnailUrl}
              alt={template.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center">
              <Monitor className="w-16 h-16 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-400 mt-2">미리보기 없음</p>
            </div>
          )}
        </div>
        {template.previewUrl && (
          <a
            href={template.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-3"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            전체 미리보기
          </a>
        )}
      </div>

      {/* Info Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">템플릿 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {template.width != null && template.height != null && (
            <div>
              <p className="text-sm text-slate-500">해상도</p>
              <p className="font-medium text-slate-800 mt-1">{template.width} x {template.height}</p>
            </div>
          )}
          {template.orientation && (
            <div>
              <p className="text-sm text-slate-500">방향</p>
              <p className="font-medium text-slate-800 mt-1">
                {template.orientation === 'landscape' ? '가로 (Landscape)' :
                 template.orientation === 'portrait' ? '세로 (Portrait)' :
                 template.orientation}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">영역 수</p>
            <p className="font-medium text-slate-800 mt-1">
              {template.zoneCount != null ? `${template.zoneCount}개` : `${zones.length}개`}
            </p>
          </div>
          {template.backgroundColor && (
            <div>
              <p className="text-sm text-slate-500">배경색</p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-6 h-6 rounded border border-slate-200"
                  style={{ backgroundColor: template.backgroundColor }}
                />
                <span className="font-medium text-slate-800 font-mono text-sm">
                  {template.backgroundColor}
                </span>
              </div>
            </div>
          )}
          {template.status && (
            <div>
              <p className="text-sm text-slate-500">상태</p>
              <p className="font-medium text-slate-800 mt-1">{template.status}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">생성일</p>
            <p className="font-medium text-slate-800 mt-1">{formatDate(template.createdAt)}</p>
          </div>
          {template.updatedAt && (
            <div>
              <p className="text-sm text-slate-500">수정일</p>
              <p className="font-medium text-slate-800 mt-1">{formatDate(template.updatedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Zones */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-primary-600" />
          레이아웃 영역 ({zones.length}개)
        </h2>
        {zones.length > 0 ? (
          <>
            {/* Visual Layout */}
            {template.width && template.height && (
              <div className="mb-6">
                <div
                  className="relative mx-auto bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    aspectRatio: `${template.width} / ${template.height}`,
                  }}
                >
                  {zones.map((zone, index) => {
                    const left = (zone.x / template.width!) * 100;
                    const top = (zone.y / template.height!) * 100;
                    const width = (zone.width / template.width!) * 100;
                    const height = (zone.height / template.height!) * 100;

                    return (
                      <div
                        key={zone.id}
                        className="absolute border-2 border-primary-400 bg-primary-50/50 flex items-center justify-center text-xs font-medium text-primary-700 rounded"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          zIndex: zone.zIndex || index,
                        }}
                        title={`${zone.name} (${zone.width}x${zone.height})`}
                      >
                        <span className="truncate px-1">{zone.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Zone List */}
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <Grid3X3 className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{zone.name}</p>
                    {zone.description && (
                      <p className="text-sm text-slate-500">{zone.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {zone.zoneType && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded">
                        {zoneTypeLabels[zone.zoneType] || zone.zoneType}
                      </span>
                    )}
                    <span className="font-mono">
                      {zone.x},{zone.y} / {zone.width}x{zone.height}
                    </span>
                    {zone.defaultMediaType && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {zone.defaultMediaType}
                      </span>
                    )}
                    {zone.zIndex != null && (
                      <span title="z-index">z:{zone.zIndex}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <Grid3X3 className="w-6 h-6 text-slate-400" />
            </div>
            <p className="mt-3 text-slate-500">등록된 영역이 없습니다</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      {template.metadata && Object.keys(template.metadata).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">메타데이터</h2>
          <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 overflow-x-auto">
            {JSON.stringify(template.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
