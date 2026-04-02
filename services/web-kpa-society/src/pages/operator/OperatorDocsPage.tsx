/**
 * OperatorDocsPage — KPA-a Operator 자료실
 *
 * WO-KPA-A-PLACEHOLDER-PAGES-IMPLEMENTATION:
 *   admin-branch 공유 더미 DocsPage를 대체하는 KPA-a operator 전용 페이지.
 *   resourcesApi 실제 연결, 더미 데이터 제거.
 *
 * 현재 상태:
 *   백엔드 /api/v1/kpa/resources는 아직 실데이터를 반환하지 않는 상태(placeholder).
 *   이 페이지는 API가 실데이터를 반환하면 즉시 동작하도록 구현되어 있으며,
 *   현재는 정직한 empty state를 표시한다.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { resourcesApi } from '../../api/resources';

// ─── Types ───

interface DocItem {
  id: string;
  title: string;
  category: string;
  fileName?: string;
  fileSize?: string;
  author?: string;
  createdAt: string;
  downloadCount?: number;
}

type CategoryFilter = 'all' | 'forms' | 'guidelines' | 'policies';

const CATEGORY_LABELS: Record<string, string> = {
  all: '전체',
  forms: '양식',
  guidelines: '가이드',
  policies: '정책/규정',
};

// ─── Component ───

export default function OperatorDocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 50 };
      if (category !== 'all') params.category = category;
      if (search.trim()) params.search = search.trim();

      const res = await resourcesApi.getResources(params);
      const items = (res as any)?.data ?? (res as any)?.items ?? [];
      setDocs(
        items.map((d: any) => ({
          id: d.id,
          title: d.title || d.name || '(제목 없음)',
          category: d.category || d.type || '-',
          fileName: d.fileName || d.file_name,
          fileSize: d.fileSize || d.file_size,
          author: d.author || d.uploaded_by,
          createdAt: d.createdAt || d.created_at || '',
          downloadCount: d.downloadCount ?? d.download_count ?? 0,
        })),
      );
    } catch {
      setError('자료 데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [category, search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={iconBoxStyle}>
            <FolderOpen size={20} color="#2563eb" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>자료실</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>운영 자료 및 문서 관리</p>
          </div>
        </div>
        <button onClick={fetchDocs} style={refreshBtnStyle}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.entries(CATEGORY_LABELS) as [CategoryFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: category === key ? 600 : 400,
                color: category === key ? '#2563eb' : '#64748b',
                backgroundColor: category === key ? '#dbeafe' : '#f8fafc',
                border: `1px solid ${category === key ? '#93c5fd' : '#e2e8f0'}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="자료 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocs()}
            style={{
              width: '100%', padding: '7px 12px 7px 30px', fontSize: 13,
              border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>자료를 불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} style={{ margin: '0 auto 12px', color: '#dc2626' }} />
          <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button onClick={fetchDocs} style={retryBtnStyle}>
            <RefreshCw size={14} /> 다시 시도
          </button>
        </div>
      ) : docs.length === 0 ? (
        <div style={emptyStyle}>
          <FileText size={36} color="#cbd5e1" />
          <p style={{ fontSize: 15, fontWeight: 500, color: '#64748b', margin: '16px 0 4px' }}>
            등록된 자료가 없습니다
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
            자료실에 등록된 문서가 아직 없습니다.<br />
            자료가 등록되면 이 화면에서 확인할 수 있습니다.
          </p>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={thStyle}>분류</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>제목</th>
                <th style={thStyle}>파일</th>
                <th style={thStyle}>다운로드</th>
                <th style={thStyle}>등록일</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500, color: '#1e293b' }}>
                    {doc.title}
                  </td>
                  <td style={tdStyle}>
                    {doc.fileName ? (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {doc.fileName}
                        {doc.fileSize && <span style={{ marginLeft: 4, color: '#94a3b8' }}>({doc.fileSize})</span>}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#64748b' }}>
                      <Download size={12} /> {doc.downloadCount ?? 0}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatDate(doc.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function formatDate(iso: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

// ─── Styles ───

const iconBoxStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10,
  backgroundColor: '#dbeafe',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const refreshBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const retryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: '60px 24px',
  backgroundColor: '#f8fafc', borderRadius: 12,
  border: '1px dashed #e2e8f0',
};

const thStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: 12, fontWeight: 600,
  color: '#64748b', textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'middle',
  textAlign: 'center', color: '#475569',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block', padding: '2px 8px',
  backgroundColor: '#f1f5f9', color: '#475569',
  borderRadius: 4, fontSize: 11, fontWeight: 500,
};
