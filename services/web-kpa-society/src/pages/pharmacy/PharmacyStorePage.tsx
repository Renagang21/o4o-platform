/**
 * PharmacyStorePage - 매장 설정
 *
 * WO-STORE-COMMON-SETTINGS-KPA-MIGRATION-V1
 *
 * 공통 Store Settings API 사용 + 블록 기반 레이아웃 편집 + 실제 iframe 미리보기
 *
 * 제거:
 *   - 8개 dead 컴포넌트 토글 (banner/categories/featured/promotion/new-arrivals/
 *     best-sellers/health-info/pharmacy-info) — storefront_config.components와 연결 없음
 *   - mock preview (emoji)
 *   - PUT /pharmacy/store/config 호출
 *
 * 추가:
 *   - GET /stores/:slug/settings (공통 API)
 *   - PATCH /stores/:slug/settings (공통 API)
 *   - 블록 편집 (순서/활성화/config) — LayoutBuilderPage 통합
 *   - iframe 실제 매장 미리보기 (/store/:slug)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { apiClient } from '../../api/client';
import { StoreBlockRegistry, type StoreBlock, type StoreBlockType } from '@o4o/ui';

// ── Types ─────────────────────────────────────────────────────────────────────

type StoreTemplate = 'BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL';
type StoreTheme = 'professional' | 'neutral' | 'clean' | 'modern';
type PreviewDevice = 'B2C' | 'TABLET' | 'KIOSK';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface StoreSettings {
  template: StoreTemplate;
  theme: StoreTheme;
  blocks: StoreBlock[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATES: Array<{ id: StoreTemplate; name: string; description: string }> = [
  { id: 'BASIC', name: '기본형', description: '균형 잡힌 표준 레이아웃' },
  { id: 'COMMERCE_FOCUS', name: '상업 강조형', description: 'B2C 판매 중심' },
  { id: 'CONTENT_FOCUS', name: '콘텐츠 중심형', description: '브랜드·전문성 강조' },
  { id: 'MINIMAL', name: '간결형', description: '핵심 요소만' },
];

const THEMES: Array<{ id: StoreTheme; name: string; primaryColor: string; accentColor: string }> = [
  { id: 'professional', name: '전문적', primaryColor: '#1e40af', accentColor: '#3b82f6' },
  { id: 'neutral',      name: '중립적', primaryColor: '#374151', accentColor: '#6b7280' },
  { id: 'clean',        name: '깔끔한', primaryColor: '#0891b2', accentColor: '#06b6d4' },
  { id: 'modern',       name: '모던',   primaryColor: '#0f172a', accentColor: '#475569' },
];

const DEVICES: Array<{ id: PreviewDevice; name: string; icon: string; maxWidth: string }> = [
  { id: 'B2C',    name: 'B2C 몰',   icon: '🛒', maxWidth: '100%' },
  { id: 'TABLET', name: '태블릿',   icon: '📱', maxWidth: '280px' },
  { id: 'KIOSK',  name: '키오스크', icon: '🖥️', maxWidth: '200px' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PharmacyStorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  // ── Store state ──────────────────────────────────────────────────────────
  const [slug, setSlug] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState('내 약국');
  const [loading, setLoading] = useState(true);

  // Settings state
  const [template, setTemplate] = useState<StoreTemplate>('BASIC');
  const [theme, setTheme] = useState<StoreTheme>('professional');
  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  const [isDefaultLayout, setIsDefaultLayout] = useState(false);

  // UI state
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('B2C');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  // ── Load settings ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await getStoreSlug();
        // WO-KPA-PHARMACY-OWNER-WITHOUT-STORE-HANDLING-V1: 매장 미연결 → 게이트로
        if (!resolved) { navigate('/pharmacy', { replace: true }); return; }
        if (cancelled) return;
        setSlug(resolved);

        const res = await apiClient.get<{
          success: boolean;
          data: { storeId: string; slug: string; settings: StoreSettings };
        }>(`/stores/${encodeURIComponent(resolved)}/settings`);

        if (cancelled) return;
        if (res.success) {
          setTemplate(res.data.settings.template);
          setTheme(res.data.settings.theme);
          setBlocks(res.data.settings.blocks ?? []);
          // storefront_blocks가 없어 generateDefaultBlocks에서 나온 경우 isDefault 처리
          setIsDefaultLayout(res.data.settings.blocks.length === 0);
        }
      } catch {
        // fallback: leave defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load pharmacy name separately
  useEffect(() => {
    (async () => {
      try {
        const { getPharmacyInfo } = await import('../../api/pharmacyInfo');
        const info = await getPharmacyInfo();
        if (info?.name) setPharmacyName(info.name);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Block editing (from LayoutBuilderPage) ────────────────────────────────
  const moveBlock = (index: number, dir: -1 | 1) => {
    if (!isOwner) return;
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setBlocks(updated);
  };

  const toggleBlock = (index: number) => {
    if (!isOwner) return;
    const updated = [...blocks];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setBlocks(updated);
  };

  const updateBlockConfig = (index: number, key: string, value: number) => {
    if (!isOwner) return;
    const updated = [...blocks];
    updated[index] = { ...updated[index], config: { ...(updated[index].config ?? {}), [key]: value } };
    setBlocks(updated);
  };

  const getBlockMeta = (type: StoreBlockType) => {
    const def = StoreBlockRegistry[type];
    return def
      ? { name: def.label, description: def.description, defaultConfig: def.defaultConfig }
      : { name: type, description: '', defaultConfig: {} };
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!slug || saveState === 'saving') return;
    setSaveState('saving');
    setError(null);
    try {
      await apiClient.patch(`/stores/${encodeURIComponent(slug)}/settings`, {
        template,
        theme,
        blocks,
      });
      setSaveState('saved');
      setIsDefaultLayout(false);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e: any) {
      setSaveState('error');
      setError(e.message || '저장에 실패했습니다');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [slug, template, theme, blocks, saveState]);

  // ── Access denied (근무약사) ──────────────────────────────────────────────
  if (!isOwner) {
    return (
      <div style={S.container}>
        <header style={S.header}>
          <Link to="/store" style={S.backLink}>&larr; 내 매장관리</Link>
          <h1 style={S.pageTitle}>매장 설정</h1>
        </header>
        <div style={S.accessDenied}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</span>
          <h2 style={S.accessDeniedTitle}>접근 권한 없음</h2>
          <p style={S.accessDeniedText}>매장 설정은 개설약사만 변경할 수 있습니다.</p>
          <Link to="/store" style={S.backButton}>돌아가기</Link>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.container}>
        <div style={{ textAlign: 'center', padding: '80px 0', color: colors.neutral400 }}>
          불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.headerContent}>
          <Link to="/store" style={S.backLink}>&larr; 내 매장관리</Link>
          <div style={S.headerMain}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h1 style={S.pharmacyName}>{pharmacyName}</h1>
              <span style={S.subLabel}>· 매장 설정</span>
            </div>
            <span style={S.roleBadge}>{roleLabel}</span>
          </div>
        </div>
      </header>

      {error && (
        <div style={S.errorBanner}>{error}</div>
      )}

      <div style={S.mainGrid}>
        {/* ── Left: Settings Panel ─────────────────────────────────────── */}
        <div style={S.settingsPanel}>

          {/* ── Section 1: 레이아웃 블록 편집 ── */}
          <div style={S.sectionGroup}>
            <div style={S.sectionGroupHeader}>
              <span style={S.sectionGroupIcon}>📐</span>
              <h2 style={S.sectionGroupTitle}>레이아웃 편집</h2>
            </div>

            <section style={S.section}>
              <h3 style={S.sectionTitle}>블록 구성</h3>
              <p style={S.sectionDesc}>블록 순서를 변경하거나 표시 여부를 설정합니다.</p>

              {isDefaultLayout && (
                <div style={S.infoNotice}>
                  기본 템플릿 레이아웃을 사용 중입니다. 변경 후 저장하면 커스텀 레이아웃이 적용됩니다.
                </div>
              )}

              {blocks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: colors.neutral400, fontSize: '14px' }}>
                  블록 정보를 불러오는 중...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {blocks.map((block, index) => {
                    const meta = getBlockMeta(block.type);
                    const hasLimitConfig = block.type === 'PRODUCT_GRID' || block.type === 'BLOG_LIST';
                    const defaultLimit = (meta.defaultConfig as any).limit;

                    return (
                      <div
                        key={block.type}
                        style={{
                          ...S.blockItem,
                          backgroundColor: block.enabled ? colors.white : colors.neutral50,
                          borderColor: block.enabled ? colors.neutral200 : colors.neutral100,
                          opacity: block.enabled ? 1 : 0.6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Move buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              onClick={() => moveBlock(index, -1)}
                              disabled={index === 0}
                              style={{ ...S.arrowBtn, opacity: index === 0 ? 0.3 : 1 }}
                            >▲</button>
                            <button
                              onClick={() => moveBlock(index, 1)}
                              disabled={index === blocks.length - 1}
                              style={{ ...S.arrowBtn, opacity: index === blocks.length - 1 ? 0.3 : 1 }}
                            >▼</button>
                          </div>

                          {/* Block info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral800 }}>{meta.name}</span>
                              <span style={{ fontSize: '11px', color: colors.neutral400, fontFamily: 'monospace' }}>{block.type}</span>
                            </div>
                            <p style={{ fontSize: '13px', color: colors.neutral500, margin: 0 }}>{meta.description}</p>
                          </div>

                          {/* Toggle */}
                          <button
                            onClick={() => toggleBlock(index)}
                            style={{
                              width: '48px', height: '28px', borderRadius: '14px',
                              border: 'none',
                              backgroundColor: block.enabled ? colors.primary : colors.neutral300,
                              cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s',
                              flexShrink: 0,
                            }}
                          >
                            <div style={{
                              width: '22px', height: '22px', borderRadius: '50%',
                              backgroundColor: colors.white,
                              position: 'absolute', top: '3px',
                              left: block.enabled ? '23px' : '3px',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }} />
                          </button>
                        </div>

                        {/* Limit config */}
                        {hasLimitConfig && block.enabled && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.neutral100}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', color: colors.neutral600 }}>표시 개수:</label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={block.config?.limit ?? defaultLimit ?? 4}
                              onChange={(e) => updateBlockConfig(index, 'limit', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                              style={{
                                width: '60px', padding: '4px 8px', borderRadius: '6px',
                                border: `1px solid ${colors.neutral200}`,
                                fontSize: '13px', textAlign: 'center',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Section 2: 디자인 설정 ── */}
          <div style={S.sectionGroup}>
            <div style={S.sectionGroupHeader}>
              <span style={S.sectionGroupIcon}>🎨</span>
              <h2 style={S.sectionGroupTitle}>디자인 설정</h2>
            </div>

            {/* Template */}
            <section style={S.section}>
              <h3 style={S.sectionTitle}>레이아웃 템플릿</h3>
              <p style={S.sectionDesc}>기본 블록 구성 구조를 선택합니다. 변경 시 블록 목록이 재설정됩니다.</p>
              <div style={S.templateGrid}>
                {TEMPLATES.map(t => (
                  <div
                    key={t.id}
                    style={{
                      ...S.templateCard,
                      borderColor: template === t.id ? colors.primary : colors.neutral200,
                      backgroundColor: template === t.id ? colors.primary + '08' : colors.white,
                    }}
                    onClick={() => isOwner && setTemplate(t.id)}
                  >
                    <div style={S.templateInfo}>
                      <h4 style={S.templateName}>{t.name}</h4>
                      <p style={S.templateDesc}>{t.description}</p>
                    </div>
                    {template === t.id && (
                      <span style={S.selectedBadge}>선택됨</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Theme */}
            <section style={S.section}>
              <h3 style={S.sectionTitle}>테마 · 컬러</h3>
              <p style={S.sectionDesc}>색상과 스타일을 선택합니다.</p>
              <div style={S.themeGrid}>
                {THEMES.map(t => (
                  <div
                    key={t.id}
                    style={{
                      ...S.themeCard,
                      borderColor: theme === t.id ? t.primaryColor : colors.neutral200,
                    }}
                    onClick={() => isOwner && setTheme(t.id)}
                  >
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: t.primaryColor, display: 'block' }} />
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: t.accentColor, display: 'block' }} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.neutral700 }}>{t.name}</span>
                    {theme === t.id && (
                      <span style={S.themeCheck}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── Right: Preview Panel ──────────────────────────────────────── */}
        <div style={S.previewPanel}>
          {/* Device tabs */}
          <div style={S.previewHeader}>
            <h2 style={S.previewTitle}>미리보기</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DEVICES.map(d => (
                <button
                  key={d.id}
                  style={{
                    ...S.deviceTab,
                    backgroundColor: previewDevice === d.id ? colors.primary : colors.white,
                    color: previewDevice === d.id ? colors.white : colors.neutral600,
                  }}
                  onClick={() => setPreviewDevice(d.id)}
                >
                  <span style={{ fontSize: '1rem' }}>{d.icon}</span>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* iframe preview */}
          <div style={S.previewFrame}>
            {slug ? (
              <div style={{ maxWidth: DEVICES.find(d => d.id === previewDevice)?.maxWidth ?? '100%', margin: '0 auto', overflow: 'hidden', borderRadius: '8px', border: `1px solid ${colors.neutral200}` }}>
                <iframe
                  key={`${slug}-${previewDevice}`}
                  src={`/store/${encodeURIComponent(slug)}`}
                  title="매장 미리보기"
                  style={{
                    width: '100%',
                    height: '500px',
                    border: 'none',
                    display: 'block',
                  }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: colors.neutral400, fontSize: '14px' }}>
                슬러그가 설정되지 않아 미리보기를 표시할 수 없습니다.
              </div>
            )}
          </div>

          {/* Open in new tab */}
          {slug && (
            <div style={{ textAlign: 'center' }}>
              <a
                href={`/store/${encodeURIComponent(slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '13px', color: colors.primary, textDecoration: 'none' }}
              >
                새 탭에서 매장 열기 →
              </a>
            </div>
          )}

          {/* Save buttons */}
          <div style={S.actionButtons}>
            <button
              style={{
                ...S.saveButton,
                opacity: saveState === 'saving' ? 0.7 : 1,
              }}
              onClick={handleSave}
              disabled={saveState === 'saving' || !slug}
            >
              {saveState === 'saving' ? '저장 중...' :
               saveState === 'saved' ? '저장 완료' :
               saveState === 'error' ? '저장 실패 — 다시 시도' :
               '변경사항 저장'}
            </button>
          </div>

          {/* Info notice */}
          <div style={S.boundaryNotice}>
            <p style={{ margin: 0, fontSize: '12px', color: colors.neutral500, lineHeight: 1.6 }}>
              블록 순서·활성화, 템플릿, 테마를 저장하면 실제 매장에 즉시 반영됩니다.
              채널 설정(B2C·태블릿·키오스크 승인)은 운영자에게 문의하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: { marginBottom: '24px' },
  headerContent: { display: 'flex', flexDirection: 'column', gap: '12px' },
  backLink: { color: colors.primary, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 },
  headerMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pharmacyName: { fontSize: '1.5rem', fontWeight: 700, color: colors.neutral900, margin: 0 },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: colors.neutral900, margin: 0 },
  subLabel: { fontSize: '1rem', color: colors.neutral500, fontWeight: 500 },
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  accessDenied: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 40px', textAlign: 'center',
  },
  accessDeniedTitle: { fontSize: '1.25rem', fontWeight: 600, color: colors.neutral800, margin: '0 0 8px' },
  accessDeniedText: { fontSize: '0.9375rem', color: colors.neutral500, margin: '0 0 24px' },
  backButton: {
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '16px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px',
  },
  settingsPanel: { display: 'flex', flexDirection: 'column', gap: '32px' },
  sectionGroup: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionGroupHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    paddingBottom: '12px', borderBottom: `2px solid ${colors.neutral200}`,
  },
  sectionGroupIcon: { fontSize: '1.25rem' },
  sectionGroupTitle: { fontSize: '1.125rem', fontWeight: 700, color: colors.neutral900, margin: 0 },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '24px',
  },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: colors.neutral800, margin: '0 0 4px' },
  sectionDesc: { fontSize: '0.875rem', color: colors.neutral500, margin: '0 0 16px' },
  infoNotice: {
    padding: '8px 12px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
    marginBottom: '16px',
  },
  blockItem: {
    padding: '16px',
    border: '1px solid',
    borderRadius: '12px',
    transition: 'all 0.15s',
  },
  arrowBtn: {
    width: '28px', height: '22px', borderRadius: '4px',
    border: `1px solid ${colors.neutral200}`, backgroundColor: colors.white,
    cursor: 'pointer', fontSize: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: colors.neutral500,
  },
  templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  templateCard: {
    position: 'relative', padding: '16px', border: '2px solid',
    borderRadius: borderRadius.md, cursor: 'pointer', transition: 'all 0.2s',
  },
  templateInfo: {},
  templateName: { fontSize: '1rem', fontWeight: 600, color: colors.neutral800, margin: 0 },
  templateDesc: { fontSize: '0.8125rem', color: colors.neutral500, margin: '4px 0 0' },
  selectedBadge: {
    position: 'absolute', top: '8px', right: '8px',
    padding: '2px 8px', backgroundColor: colors.primary, color: colors.white,
    borderRadius: '10px', fontSize: '0.6875rem', fontWeight: 600,
  },
  themeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  themeCard: {
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '8px', padding: '16px', border: '2px solid', borderRadius: borderRadius.md,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  themeCheck: {
    position: 'absolute', top: '4px', right: '4px',
    width: '20px', height: '20px', backgroundColor: colors.primary, color: colors.white,
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem', fontWeight: 600,
  },
  previewPanel: {
    display: 'flex', flexDirection: 'column', gap: '16px',
    position: 'sticky', top: '100px', height: 'fit-content',
  },
  previewHeader: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    boxShadow: shadows.sm, padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  previewTitle: { fontSize: '1.125rem', fontWeight: 600, color: colors.neutral800, margin: 0 },
  deviceTab: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 10px', border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md, fontSize: '0.8125rem', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  previewFrame: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    boxShadow: shadows.sm, padding: '16px',
    overflow: 'hidden',
  },
  actionButtons: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    boxShadow: shadows.sm, padding: '16px',
  },
  saveButton: {
    width: '100%', padding: '12px',
    backgroundColor: colors.primary, color: colors.white,
    border: 'none', borderRadius: borderRadius.md,
    fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer',
  },
  boundaryNotice: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    boxShadow: shadows.sm, padding: '16px',
  },
};

export default PharmacyStorePage;
