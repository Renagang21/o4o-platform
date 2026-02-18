/**
 * PharmacyTemplatePage — Staff Template Profile Selection
 *
 * WO-STORE-TEMPLATE-PROFILE-V1
 *
 * 경로: /pharmacy/template
 * 인증 필수 + PharmacyGuard
 * 4개 Template Profile 중 선택
 */

import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '../../contexts/AuthContext';

type TemplateProfile = 'BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL';

const GLYCOPHARM_API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
  : '/api/v1/glycopharm';

interface TemplateOption {
  id: TemplateProfile;
  name: string;
  description: string;
  blocks: string[];
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'BASIC',
    name: '기본형',
    description: '대부분의 매장에 적합한 균형 잡힌 구성',
    blocks: ['Hero', '추천 상품', '블로그 미리보기', '태블릿 안내'],
  },
  {
    id: 'COMMERCE_FOCUS',
    name: '상업 강조형',
    description: 'B2C 판매 중심 매장용. 상품을 최대한 강조',
    blocks: ['Hero (프로모션)', '추천 상품', '블로그 미리보기'],
  },
  {
    id: 'CONTENT_FOCUS',
    name: '콘텐츠 중심형',
    description: '브랜드/전문성 강조. 블로그가 상단에 배치',
    blocks: ['Hero (브랜드)', '블로그 미리보기', '매장 소개', '추천 상품'],
  },
  {
    id: 'MINIMAL',
    name: '간결형',
    description: '최소한의 요소만 표시. 단순한 매장에 적합',
    blocks: ['Hero', '추천 상품'],
  },
];

export function PharmacyTemplatePage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [current, setCurrent] = useState<TemplateProfile>('BASIC');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Resolve slug from cockpit
  useEffect(() => {
    const fetchSlug = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${GLYCOPHARM_API}/cockpit/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.data?.storeSlug) {
          setSlug(json.data.storeSlug);
        } else {
          setError('매장 정보를 찾을 수 없습니다.');
        }
      } catch {
        setError('매장 정보를 불러올 수 없습니다.');
      }
    };
    fetchSlug();
  }, []);

  // Fetch current template
  const loadTemplate = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/template`);
      const json = await res.json();
      if (json.success) {
        setCurrent(json.data.templateProfile || 'BASIC');
      }
    } catch { /* fallback to BASIC */ }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { loadTemplate(); }, [loadTemplate]);

  const handleSelect = async (profile: TemplateProfile) => {
    if (!slug || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ templateProfile: profile }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update');
      setCurrent(profile);
      setSuccess('템플릿이 변경되었습니다.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>스토어 템플릿</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          매장 스토어프론트의 표시 구조를 선택합니다. 기능은 동일하며 블록 배치만 달라집니다.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '14px', marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>불러오는 중...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {TEMPLATES.map((tmpl) => {
            const isSelected = current === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => handleSelect(tmpl.id)}
                disabled={saving}
                style={{
                  padding: '16px',
                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  textAlign: 'left',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: isSelected ? '#2563eb' : '#1e293b' }}>
                    {tmpl.name}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                      사용 중
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', lineHeight: 1.5 }}>
                  {tmpl.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {tmpl.blocks.map((block, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '16px', height: '4px', borderRadius: '2px', backgroundColor: isSelected ? '#93c5fd' : '#e2e8f0' }} />
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{block}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Preview link */}
      {slug && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={`/store/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}
          >
            스토어프론트 미리보기 →
          </a>
        </div>
      )}
    </div>
  );
}

export default PharmacyTemplatePage;
