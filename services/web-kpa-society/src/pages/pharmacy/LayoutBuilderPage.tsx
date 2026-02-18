/**
 * LayoutBuilderPage — Store Block Layout Builder
 *
 * WO-STORE-BLOCK-ENGINE-V1
 * WO-STORE-BLOCK-REGISTRY-V1: Registry에서 label/description 참조
 *
 * 경로: /pharmacy/layout-builder
 * 인증 필수 + PharmacyGuard
 *
 * 블록 순서 변경 (Up/Down), 활성화 토글, config 수정.
 * v1: 버튼 방식. v2에서 Drag & Drop 도입 예정.
 */

import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '../../contexts/AuthContext';
import {
  StoreBlockRegistry,
  type StoreBlock,
  type StoreBlockType,
} from '@o4o/ui';

const GLYCOPHARM_API = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
  : '/api/v1/glycopharm';

export function LayoutBuilderPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  const [isDefault, setIsDefault] = useState(true);
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

  // Load layout
  const loadLayout = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/layout`);
      const json = await res.json();
      if (json.success) {
        setBlocks(json.data.blocks || []);
        setIsDefault(json.data.isDefault ?? true);
      }
    } catch { /* fallback empty */ }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { loadLayout(); }, [loadLayout]);

  // Move block up/down
  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setBlocks(updated);
  };

  // Toggle enabled
  const toggleEnabled = (index: number) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setBlocks(updated);
  };

  // Update config value
  const updateConfig = (index: number, key: string, value: number) => {
    const updated = [...blocks];
    updated[index] = {
      ...updated[index],
      config: { ...(updated[index].config || {}), [key]: value },
    };
    setBlocks(updated);
  };

  // Save layout
  const handleSave = async () => {
    if (!slug || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${GLYCOPHARM_API}/stores/${encodeURIComponent(slug)}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ blocks }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to save');
      setIsDefault(false);
      setSuccess('레이아웃이 저장되었습니다.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /** Registry lookup — label, description, defaultConfig */
  const getBlockMeta = (type: StoreBlockType) => {
    const def = StoreBlockRegistry[type];
    return def
      ? { name: def.label, description: def.description, defaultConfig: def.defaultConfig }
      : { name: type, description: '', defaultConfig: {} };
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>스토어 레이아웃</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          매장 스토어프론트의 블록 순서와 표시 여부를 설정합니다.
        </p>
        {isDefault && (
          <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
            현재 기본 템플릿 레이아웃을 사용 중입니다. 변경 후 저장하면 커스텀 레이아웃이 적용됩니다.
          </div>
        )}
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
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {blocks.map((block, index) => {
              const meta = getBlockMeta(block.type);
              const hasLimitConfig = block.type === 'PRODUCT_GRID' || block.type === 'BLOG_LIST';
              const defaultLimit = meta.defaultConfig.limit;

              return (
                <div
                  key={block.type}
                  style={{
                    padding: '16px',
                    backgroundColor: block.enabled ? '#fff' : '#f8fafc',
                    border: '1px solid',
                    borderColor: block.enabled ? '#e2e8f0' : '#f1f5f9',
                    borderRadius: '12px',
                    opacity: block.enabled ? 1 : 0.6,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Move buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        style={{ ...arrowBtn, opacity: index === 0 ? 0.3 : 1 }}
                        title="위로"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                        style={{ ...arrowBtn, opacity: index === blocks.length - 1 ? 0.3 : 1 }}
                        title="아래로"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Block info — from registry */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{meta.name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{block.type}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#64748b' }}>{meta.description}</p>
                    </div>

                    {/* Enable toggle */}
                    <button
                      onClick={() => toggleEnabled(index)}
                      style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '14px',
                        border: 'none',
                        backgroundColor: block.enabled ? '#3b82f6' : '#cbd5e1',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          position: 'absolute',
                          top: '3px',
                          left: block.enabled ? '23px' : '3px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                      />
                    </button>
                  </div>

                  {/* Config: limit */}
                  {hasLimitConfig && block.enabled && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: '#475569' }}>표시 개수:</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={block.config?.limit || defaultLimit || 4}
                        onChange={(e) => updateConfig(index, 'limit', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                        style={{
                          width: '60px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '13px',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '저장 중...' : '레이아웃 저장'}
            </button>
          </div>

          {/* Preview link */}
          {slug && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
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
        </>
      )}
    </div>
  );
}

const arrowBtn: React.CSSProperties = {
  width: '28px',
  height: '22px',
  borderRadius: '4px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748b',
};

export default LayoutBuilderPage;
