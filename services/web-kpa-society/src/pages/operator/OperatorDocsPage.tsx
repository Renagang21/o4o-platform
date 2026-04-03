/**
 * OperatorDocsPage — KPA-a Operator 자료실
 *
 * WO-KPA-A-RESOURCES-API-IMPLEMENTATION-V1: 실데이터 조회
 * WO-KPA-A-OPERATOR-RESOURCES-CMS-V1: 등록/수정/삭제 CMS 기능
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
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

const DB_CATEGORIES = [
  { value: 'general', label: '일반' },
  { value: 'form', label: '양식' },
  { value: 'guide', label: '가이드' },
  { value: 'regulation', label: '정책/규정' },
];

// ─── Component ───

export default function OperatorDocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  // CMS state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'general', fileUrl: '', fileName: '', fileSize: 0 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resetForm = () => {
    setFormData({ title: '', description: '', category: 'general', fileUrl: '', fileName: '', fileSize: 0 });
    setEditingId(null);
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (doc: DocItem) => {
    setFormData({
      title: doc.title,
      description: '',
      category: doc.category,
      fileUrl: '',
      fileName: doc.fileName || '',
      fileSize: typeof doc.fileSize === 'number' ? doc.fileSize : 0,
    });
    setEditingId(doc.id);
    setFormOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await resourcesApi.uploadFile(file);
    if (result) {
      setFormData((f) => ({
        ...f,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
      }));
    } else {
      alert('파일 업로드에 실패했습니다');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await resourcesApi.updateResource(editingId, {
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          ...(formData.fileUrl && { fileUrl: formData.fileUrl, fileName: formData.fileName, fileSize: formData.fileSize }),
        });
      } else {
        await resourcesApi.createResource({
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          fileUrl: formData.fileUrl || undefined,
          fileName: formData.fileName || undefined,
          fileSize: formData.fileSize || undefined,
        });
      }
      resetForm();
      fetchDocs();
    } catch {
      alert('저장에 실패했습니다');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 자료를 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      await resourcesApi.deleteResource(id);
      fetchDocs();
    } catch {
      alert('삭제에 실패했습니다');
    }
    setDeleting(null);
  };

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchDocs} style={refreshBtnStyle}>
            <RefreshCw size={14} /> 새로고침
          </button>
          <button onClick={openCreate} style={primaryBtnStyle}>
            <Plus size={14} /> 자료 등록
          </button>
        </div>
      </div>

      {/* CMS Form */}
      {formOpen && (
        <div style={formContainerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: 0 }}>
              {editingId ? '자료 수정' : '자료 등록'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>분류</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                style={inputStyle}
              >
                {DB_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder="자료 제목"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="자료 설명 (선택)"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>파일</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={uploadBtnStyle}>
                  <Upload size={14} /> {uploading ? '업로드 중...' : '파일 선택'}
                </button>
                {formData.fileName && (
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    {formData.fileName}
                    {formData.fileSize > 0 && <span style={{ color: '#94a3b8', marginLeft: 4 }}>({formatFileSize(formData.fileSize)})</span>}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={resetForm} style={cancelBtnStyle}>취소</button>
              <button onClick={handleSave} disabled={saving || !formData.title.trim()} style={saveBtnStyle}>
                {saving ? '저장 중...' : editingId ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.6 }}>
            자료실에 등록된 문서가 아직 없습니다.
          </p>
          <button onClick={openCreate} style={primaryBtnStyle}>
            <Plus size={14} /> 자료 등록
          </button>
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
                <th style={thStyle}>관리</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>
                      {DB_CATEGORIES.find((c) => c.value === doc.category)?.label || CATEGORY_LABELS[doc.category] || doc.category}
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
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => openEdit(doc)} style={actionBtnStyle} title="수정">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        style={{ ...actionBtnStyle, color: '#ef4444' }}
                        title="삭제"
                      >
                        {deleting === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#fff', backgroundColor: '#2563eb',
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

const formContainerStyle: React.CSSProperties = {
  marginBottom: 20, padding: 20,
  border: '1px solid #dbeafe', borderRadius: 12,
  backgroundColor: '#f0f7ff',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: '#475569', marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
  boxSizing: 'border-box',
};

const uploadBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '6px 12px', fontSize: 12, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#64748b', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '8px 20px', fontSize: 13, fontWeight: 500,
  color: '#fff', backgroundColor: '#2563eb',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, border: 'none', borderRadius: 6,
  backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer',
};
