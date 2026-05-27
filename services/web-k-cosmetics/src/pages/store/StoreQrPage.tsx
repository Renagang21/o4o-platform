/**
 * StoreQrPage — K-Cosmetics QR 관리
 *
 * WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1
 * Adapted from GlycoPharm StoreQrPage (KPA canonical pattern).
 *
 * API prefix: /cosmetics (backend: createStoreQrLandingController serviceKey='cosmetics')
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseProductionRouterState } from '@o4o/store-ui-core';
import {
  ArrowLeft,
  QrCode,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/apiClient';
import { getAccessToken } from '@o4o/auth-client';
import { toast } from '@o4o/error-handling';

type LandingType = 'link' | 'product' | 'promotion' | 'page';

interface QrItem {
  id: string;
  title: string;
  description: string | null;
  landingType: LandingType;
  landingTargetId: string | null;
  slug: string;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateQrForm {
  title: string;
  description: string;
  landingType: LandingType;
  landingTargetId: string;
  slug: string;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

function generateSlug(title: string): string {
  const base = toSlug(title) || 'qr';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR');
}

const LANDING_TYPE_CONFIG: Record<LandingType, { label: string; cls: string; placeholder: string }> = {
  link:      { label: '링크', cls: 'bg-blue-50 text-blue-700', placeholder: 'https://example.com' },
  product:   { label: '상품', cls: 'bg-purple-50 text-purple-700', placeholder: '상품 ID 또는 URL' },
  promotion: { label: '프로모션', cls: 'bg-amber-50 text-amber-600', placeholder: '프로모션 ID 또는 URL' },
  page:      { label: '페이지', cls: 'bg-green-50 text-green-700', placeholder: '/store/... 경로 또는 URL' },
};

async function qrFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/cosmetics${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export default function StoreQrPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<QrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Prefill from library router state if present
  const initFormFromState = (): CreateQrForm => {
    const prod = parseProductionRouterState(location.state);
    if (prod?.source?.items?.length) {
      const item = prod.source.items[0];
      return { title: item.title, description: item.description ?? '', landingType: 'link', landingTargetId: '', slug: generateSlug(item.title) };
    }
    return { title: '', description: '', landingType: 'link', landingTargetId: '', slug: '' };
  };

  const [showCreate, setShowCreate] = useState(() => {
    return !!(parseProductionRouterState(location.state)?.source?.items?.length);
  });
  const [form, setForm] = useState<CreateQrForm>(initFormFromState);
  const [creating, setCreating] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await qrFetch<{ success: boolean; data: { items: QrItem[] } }>('/pharmacy/qr');
      setItems(res.data?.items ?? []);
    } catch (err: any) {
      setError(err?.message || 'QR 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setForm({ title: '', description: '', landingType: 'link', landingTargetId: '', slug: '' });
    setShowCreate(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug ? prev.slug : generateSlug(title),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('제목을 입력해주세요'); return; }
    const slug = form.slug.trim() || generateSlug(form.title);
    if (!slug) { toast.error('슬러그를 입력해주세요'); return; }

    setCreating(true);
    try {
      await qrFetch('/pharmacy/qr', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          landingType: form.landingType,
          landingTargetId: form.landingTargetId.trim() || undefined,
          slug,
        }),
      });
      toast.success('QR 코드가 생성되었습니다');
      setShowCreate(false);
      loadItems();
    } catch (err: any) {
      toast.error(err?.message || 'QR 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (qr: QrItem) => {
    if (!window.confirm(`"${qr.title}" QR 코드를 삭제합니다. 계속하시겠습니까?`)) return;
    setDeletingId(qr.id);
    try {
      await qrFetch(`/pharmacy/qr/${qr.id}`, { method: 'DELETE' });
      toast.success(`"${qr.title}" QR 코드가 삭제되었습니다`);
      loadItems();
    } catch (err: any) {
      toast.error(err?.message || 'QR 삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (qr: QrItem) => {
    setDownloadingId(qr.id);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}/api/v1/cosmetics/pharmacy/qr/${qr.id}/image?format=png&size=512`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error('이미지 다운로드 실패');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${qr.slug}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      toast.error(err?.message || 'QR 이미지 다운로드에 실패했습니다');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopy = async (qr: QrItem) => {
    const landingUrl = `${window.location.origin}/qr/${qr.slug}`;
    try {
      await navigator.clipboard.writeText(landingUrl);
      setCopiedId(qr.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('클립보드 복사에 실패했습니다');
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 80 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={20} color="#db2777" />
            QR 관리
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            매장 QR 코드 생성 및 관리 — 총 {items.length}개
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadItems} style={refreshBtnStyle}><RefreshCw size={13} /></button>
          <button onClick={openCreate} style={createBtnStyle}><Plus size={14} />새 QR 만들기</button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>QR 목록을 불러오는 중...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <AlertCircle size={28} style={{ margin: '0 auto 12px', color: '#dc2626' }} />
          <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button onClick={loadItems} style={retryBtnStyle}><RefreshCw size={13} /> 다시 시도</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <QrCode size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, marginBottom: 8 }}>등록된 QR 코드가 없습니다</p>
          <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 20 }}>
            새 QR 코드를 만들어 매장 자료, 홈페이지, 이벤트 페이지로 연결하세요
          </p>
          <button onClick={openCreate} style={createBtnStyle}><Plus size={14} /> 첫 QR 만들기</button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((qr) => {
            const typeConf = LANDING_TYPE_CONFIG[qr.landingType] ?? { label: qr.landingType, cls: 'bg-slate-100 text-slate-600', placeholder: '' };
            const landingUrl = `${window.location.origin}/qr/${qr.slug}`;
            return (
              <div key={qr.id} style={qrCardStyle}>
                <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <QrCode size={22} color="#db2777" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: 0 }}>{qr.title}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConf.cls}`}>{typeConf.label}</span>
                    {!qr.isActive && (
                      <span style={{ fontSize: 11, backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '2px 8px', borderRadius: 4 }}>비활성</span>
                    )}
                  </div>
                  {qr.description && (
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 3, marginBottom: 0 }}>{qr.description}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{landingUrl}</span>
                    {qr.landingTargetId && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>→ {qr.landingTargetId.slice(0, 60)}{qr.landingTargetId.length > 60 ? '...' : ''}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>스캔 {qr.scanCount}회</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(qr.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => handleCopy(qr)} title="랜딩 URL 복사" style={iconBtnStyle}>
                    {copiedId === qr.id ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  </button>
                  <button onClick={() => handleDownload(qr)} disabled={downloadingId === qr.id} title="QR 이미지 다운로드" style={iconBtnStyle}>
                    {downloadingId === qr.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  </button>
                  <button onClick={() => handleDelete(qr)} disabled={deletingId === qr.id} title="QR 삭제" style={{ ...iconBtnStyle, color: '#ef4444' }}>
                    {deletingId === qr.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>새 QR 코드 만들기</h2>
              <button onClick={() => setShowCreate(false)} style={closeBtnStyle}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>제목 <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="QR 코드 이름을 입력하세요"
                  maxLength={300}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>유형</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Object.keys(LANDING_TYPE_CONFIG) as LandingType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, landingType: type }))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: `2px solid ${form.landingType === type ? '#db2777' : '#e2e8f0'}`,
                        backgroundColor: form.landingType === type ? '#fdf2f8' : '#fff',
                        color: form.landingType === type ? '#db2777' : '#64748b',
                        fontWeight: form.landingType === type ? 600 : 400,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {LANDING_TYPE_CONFIG[type].label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>대상 URL / ID</label>
                <input
                  type="text"
                  value={form.landingTargetId}
                  onChange={(e) => setForm((prev) => ({ ...prev, landingTargetId: e.target.value }))}
                  placeholder={LANDING_TYPE_CONFIG[form.landingType].placeholder}
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>설명 / 메모</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="QR 코드 용도나 메모 (선택)"
                  style={inputStyle}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  슬러그 <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>— 공개 URL의 일부 (자동 생성, 수정 가능)</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="자동 생성됩니다"
                    maxLength={200}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, slug: generateSlug(prev.title || 'qr') }))}
                    style={refreshBtnStyle}
                    title="슬러그 재생성"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
                {form.slug && (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    공개 URL: {window.location.origin}/qr/<strong>{form.slug}</strong>
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={cancelBtnStyle}>취소</button>
                <button
                  type="submit"
                  disabled={creating || !form.title.trim()}
                  style={{ ...createBtnStyle, opacity: creating || !form.title.trim() ? 0.6 : 1, cursor: creating || !form.title.trim() ? 'not-allowed' : 'pointer' }}
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {creating ? '생성 중...' : 'QR 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '6px 8px',
  border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#fff',
  cursor: 'pointer', color: '#64748b',
};

const createBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', backgroundColor: '#db2777', color: '#fff',
  borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
};

const refreshBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 8,
  backgroundColor: '#fff', cursor: 'pointer', color: '#64748b', flexShrink: 0,
};

const retryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#475569', backgroundColor: '#fff', cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 8,
  backgroundColor: '#fff', cursor: 'pointer', color: '#64748b',
};

const qrCardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '14px 16px', backgroundColor: '#fff',
  border: '1px solid #e2e8f0', borderRadius: 12,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '16px',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: 16, padding: 28,
  width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  maxHeight: '90vh', overflowY: 'auto',
};

const closeBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, border: 'none', borderRadius: 8,
  backgroundColor: '#f1f5f9', cursor: 'pointer', color: '#64748b',
};

const fieldGroupStyle: React.CSSProperties = { marginBottom: 16 };

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#64748b', backgroundColor: '#fff', cursor: 'pointer',
};
