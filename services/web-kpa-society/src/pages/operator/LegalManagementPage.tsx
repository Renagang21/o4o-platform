/**
 * LegalManagementPage - 약관 관리 페이지
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V3: Phase 3
 * Backend API 연동 — localStorage 의존 제거
 *
 * 기능:
 * - 문서 유형별 탭 (이용약관 / 개인정보처리방침)
 * - 목록 조회, 편집, 저장, 게시 상태 변경
 */

import { useState, useEffect, useCallback } from 'react';
import { Save, FileText, Shield, AlertCircle, CheckCircle, Globe, FileEdit } from 'lucide-react';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type DocType = 'terms' | 'privacy';

interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

export function LegalManagementPage() {
  const [activeTab, setActiveTab] = useState<DocType>('terms');
  const [documents, setDocuments] = useState<Record<DocType, LegalDocument | null>>({
    terms: null,
    privacy: null,
  });
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: LegalDocument[] }>(
        '/api/v1/kpa/operator/legal/documents',
      );
      const docs = res.data || [];
      const termsDoc = docs.find((d) => d.document_type === 'terms') || null;
      const privacyDoc = docs.find((d) => d.document_type === 'privacy') || null;
      setDocuments({ terms: termsDoc, privacy: privacyDoc });
    } catch (e: any) {
      setMessage({ type: 'error', text: `문서 목록 로드 실패: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Sync editor content when tab changes or documents load
  useEffect(() => {
    const doc = documents[activeTab];
    setEditContent(doc?.content || '');
    setEditTitle(doc?.title || DOC_TYPE_LABELS[activeTab]);
  }, [activeTab, documents]);

  const currentDoc = documents[activeTab];

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (currentDoc) {
        // Update existing
        await apiFetch(`/api/v1/kpa/operator/legal/documents/${currentDoc.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title: editTitle, content: editContent }),
        });
      } else {
        // Create new
        await apiFetch('/api/v1/kpa/operator/legal/documents', {
          method: 'POST',
          body: JSON.stringify({
            document_type: activeTab,
            title: editTitle,
            content: editContent,
          }),
        });
      }

      setMessage({ type: 'success', text: `${DOC_TYPE_LABELS[activeTab]}이 저장되었습니다.` });
      await fetchDocuments();
    } catch (e: any) {
      setMessage({ type: 'error', text: `저장 실패: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!currentDoc) return;
    setPublishing(true);
    setMessage(null);

    const action = currentDoc.status === 'published' ? 'unpublish' : 'publish';
    const actionLabel = action === 'publish' ? '게시' : '게시 해제';

    try {
      await apiFetch(`/api/v1/kpa/operator/legal/documents/${currentDoc.id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setMessage({ type: 'success', text: `${DOC_TYPE_LABELS[activeTab]} ${actionLabel} 완료.` });
      await fetchDocuments();
    } catch (e: any) {
      setMessage({ type: 'error', text: `${actionLabel} 실패: ${e.message}` });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-96" />
          <div className="h-96 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">약관 관리</h1>
        <p className="text-slate-600 mt-1">
          서비스 이용약관과 개인정보처리방침을 편집합니다.
          회원가입 시 사용자가 동의해야 하는 내용입니다.
        </p>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">약관 작성 안내</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Markdown 형식으로 작성할 수 있습니다. (# 제목, ## 소제목, - 목록 등)</li>
              <li>저장 후 &apos;게시&apos; 버튼을 눌러야 회원에게 적용됩니다.</li>
              <li>중요한 변경사항은 회원에게 별도로 안내해 주세요.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'terms'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          이용약관
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'privacy'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          개인정보처리방침
        </button>
      </div>

      {/* 게시 상태 표시 */}
      {currentDoc && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 ${
          currentDoc.status === 'published'
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          {currentDoc.status === 'published' ? (
            <>
              <Globe className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">게시 중</span>
              {currentDoc.published_at && (
                <span className="text-xs text-green-600 ml-2">
                  게시일: {new Date(currentDoc.published_at).toLocaleDateString('ko-KR')}
                </span>
              )}
            </>
          ) : (
            <>
              <FileEdit className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">임시저장 (미게시)</span>
            </>
          )}
        </div>
      )}

      {/* 저장 메시지 */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* 에디터 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 w-64"
            placeholder="문서 제목"
          />
          <div className="flex items-center gap-2">
            {currentDoc && (
              <button
                onClick={handlePublishToggle}
                disabled={publishing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  currentDoc.status === 'published'
                    ? 'text-amber-700 hover:bg-amber-100 border border-amber-300'
                    : 'text-green-700 hover:bg-green-100 border border-green-300'
                }`}
              >
                <Globe className="w-4 h-4" />
                {publishing
                  ? '처리 중...'
                  : currentDoc.status === 'published'
                    ? '게시 해제'
                    : '게시'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[500px] p-4 font-mono text-sm text-slate-800 resize-none focus:outline-none"
          placeholder={`${DOC_TYPE_LABELS[activeTab]} 내용을 입력하세요...`}
        />
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 text-sm text-slate-500">
        <p>
          * 저장된 문서는 &apos;게시&apos; 버튼을 눌러야 회원에게 적용됩니다.
          같은 유형의 문서는 하나만 게시 상태를 유지할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
