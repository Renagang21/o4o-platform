/**
 * ResourceFormPage — 자료 등록/수정 (통합 폼)
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * new: /operator/resources/new
 * edit: /operator/resources/:id/edit
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || body?.error || `API error ${res.status}`);
  return body;
}

interface FormValues {
  title: string;
  content: string;
  file_url: string;
  external_url: string;
  type: 'TEXT' | 'FILE';
  tagsInput: string;
  role: string;
  memo: string;
}

const EMPTY: FormValues = {
  title: '',
  content: '',
  file_url: '',
  external_url: '',
  type: 'TEXT',
  tagsInput: '',
  role: '',
  memo: '',
};

export default function ResourceFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState<FormValues>(EMPTY);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const result = await apiFetch<{ success: boolean; data: any }>(`/api/v1/kpa/resources/${id}`);
        const d = result.data;
        setForm({
          title: d.title || '',
          content: d.content || '',
          file_url: d.file_url || '',
          external_url: d.external_url || '',
          type: d.type || 'TEXT',
          tagsInput: Array.isArray(d.tags) ? d.tags.join(', ') : '',
          role: d.role || '',
          memo: d.memo || '',
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isEdit]);

  const set = (key: keyof FormValues) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('제목을 입력하세요'); return; }
    if (!form.content.trim() && !form.file_url.trim() && !form.external_url.trim()) {
      toast.error('내용, 파일 URL, 외부 URL 중 하나를 입력하세요');
      return;
    }

    const tags = form.tagsInput
      .split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      content: form.content.trim() || null,
      file_url: form.file_url.trim() || null,
      external_url: form.external_url.trim() || null,
      type: form.type,
      tags,
      role: form.role.trim() || null,
      memo: form.memo.trim() || null,
    };

    setIsSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/api/v1/kpa/resources/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('자료가 수정되었습니다');
      } else {
        await apiFetch(`/api/v1/kpa/resources`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('자료가 등록되었습니다');
      }
      navigate('/operator/resources');
    } catch (e: any) {
      toast.error(e.message || '저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>불러오는 중...</div>;
  }
  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>;
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: '#374151', marginBottom: 6,
  };

  return (
    <div style={{ padding: '24px', maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/operator/resources')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          {isEdit ? '자료 수정' : '자료 추가'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 24 }}>

          {/* 제목 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              제목 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="자료 제목을 입력하세요"
              style={fieldStyle}
              required
            />
          </div>

          {/* 유형 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>유형</label>
            <select value={form.type} onChange={set('type')} style={fieldStyle}>
              <option value="TEXT">텍스트</option>
              <option value="FILE">파일</option>
            </select>
          </div>

          {/* 내용 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>내용 (텍스트)</label>
            <textarea
              value={form.content}
              onChange={set('content')}
              placeholder="텍스트 내용을 입력하세요"
              rows={6}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          {/* 파일 URL */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>파일 URL</label>
            <input
              value={form.file_url}
              onChange={set('file_url')}
              placeholder="https://... (파일 또는 이미지 URL)"
              style={fieldStyle}
            />
          </div>

          {/* 외부 URL */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>외부 링크 URL</label>
            <input
              value={form.external_url}
              onChange={set('external_url')}
              placeholder="https://... (참조 링크)"
              style={fieldStyle}
            />
          </div>

          {/* 태그 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>태그</label>
            <input
              value={form.tagsInput}
              onChange={set('tagsInput')}
              placeholder="#우루사, #간장약, #영양제 (쉼표 또는 공백으로 구분)"
              style={fieldStyle}
            />
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              # 기호는 자동으로 처리됩니다
            </p>
          </div>

          {/* 자료 역할 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>자료 역할 (선택)</label>
            <input
              value={form.role}
              onChange={set('role')}
              placeholder="예: 제품설명, 복약안내, 홍보자료"
              style={fieldStyle}
            />
          </div>

          {/* 메모 */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>메모 (선택)</label>
            <textarea
              value={form.memo}
              onChange={set('memo')}
              placeholder="내부 메모를 입력하세요"
              rows={3}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => navigate('/operator/resources')}
            style={{
              padding: '9px 20px', borderRadius: 8,
              background: '#fff', color: '#374151',
              border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 14,
            }}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8,
              background: isSaving ? '#93c5fd' : '#2563eb',
              color: '#fff', border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            <Save size={15} />
            {isSaving ? '저장 중...' : (isEdit ? '수정 완료' : '등록')}
          </button>
        </div>
      </form>
    </div>
  );
}
