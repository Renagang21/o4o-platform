/**
 * PharmacyStorePage - 약국 매장 UI-UX 관리
 *
 * WO-KPA-PHARMACY-STORE-UX-TEMPLATE-V1
 * - 약국 매장 화면(B2C 몰, 태블릿, 키오스크) UI-UX 표준화
 * - 템플릿 선택 (구조 변경 불가)
 * - 테마 선택 (색상/폰트/스타일)
 * - 컴포넌트 On/Off (순서 변경 불가)
 * - 디바이스별 미리보기
 *
 * 핵심 원칙:
 * "약국 매장 UI는 자유 편집 대상이 아니라 표준 템플릿을 선택하는 구조다."
 *
 * 표준 범위: 템플릿 선택, 테마 선택, 컴포넌트 On/Off
 * 유료 커스텀: 템플릿 구조 변경, 신규 컴포넌트, 레이아웃 재배치
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';
import { getStoreConfig, saveStoreConfig } from '../../api/pharmacyStoreConfig';

// 템플릿 정의
const templates = [
  {
    id: 'standard',
    name: 'Standard',
    description: '기본 레이아웃, 가장 많이 사용',
    preview: '📋',
    features: ['상단 배너', '카테고리 그리드', '추천 상품', '프로모션'],
  },
  {
    id: 'compact',
    name: 'Compact',
    description: '정보 밀도 높음, 상품 중심',
    preview: '📦',
    features: ['미니 헤더', '리스트 뷰', '빠른 검색', '가격 강조'],
  },
  {
    id: 'visual',
    name: 'Visual',
    description: '이미지 중심, 시각적 강조',
    preview: '🖼️',
    features: ['풀스크린 배너', '이미지 그리드', '캐러셀', '비주얼 프로모션'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: '깔끔하고 단순한 디자인',
    preview: '✨',
    features: ['심플 헤더', '여백 활용', '텍스트 중심', '깔끔한 카드'],
  },
];

// 테마 정의
const themes = [
  { id: 'default', name: '기본', primaryColor: '#2563EB', accentColor: '#3B82F6' },
  { id: 'warm', name: '따뜻한', primaryColor: '#EA580C', accentColor: '#F97316' },
  { id: 'nature', name: '자연', primaryColor: '#16A34A', accentColor: '#22C55E' },
  { id: 'elegant', name: '우아한', primaryColor: '#7C3AED', accentColor: '#8B5CF6' },
  { id: 'modern', name: '모던', primaryColor: '#0F172A', accentColor: '#475569' },
  { id: 'soft', name: '부드러운', primaryColor: '#EC4899', accentColor: '#F472B6' },
];

// 컴포넌트 정의 (On/Off 가능)
const storeComponents = [
  { id: 'banner', name: '상단 배너', description: '메인 프로모션 영역', required: true },
  { id: 'categories', name: '카테고리', description: '상품 카테고리 네비게이션', required: true },
  { id: 'featured', name: '추천 상품', description: '약사 추천 상품 영역', required: false },
  { id: 'promotion', name: '프로모션', description: '할인/이벤트 영역', required: false },
  { id: 'new-arrivals', name: '신상품', description: '최근 등록 상품', required: false },
  { id: 'best-sellers', name: '베스트셀러', description: '인기 상품 목록', required: false },
  { id: 'health-info', name: '건강 정보', description: '건강 팁/정보 콘텐츠', required: false },
  { id: 'pharmacy-info', name: '약국 소개', description: '약국 정보 및 연락처', required: false },
];

// 디바이스 정의
const devices = [
  { id: 'mall', name: 'B2C 몰', icon: '🛒', description: '웹/모바일 쇼핑몰' },
  { id: 'tablet', name: '태블릿', icon: '📱', description: '매장 태블릿 디스플레이' },
  { id: 'kiosk', name: '키오스크', icon: '🖥️', description: '무인 주문/안내 키오스크' },
];

// 기본 설정값
const defaultSettings = {
  template: 'standard',
  theme: 'default',
  components: {
    'banner': true,
    'categories': true,
    'featured': true,
    'promotion': true,
    'new-arrivals': false,
    'best-sellers': true,
    'health-info': false,
    'pharmacy-info': true,
  },
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function PharmacyStorePage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  // 상태 관리
  const [selectedTemplate, setSelectedTemplate] = useState(defaultSettings.template);
  const [selectedTheme, setSelectedTheme] = useState(defaultSettings.theme);
  const [componentStates, setComponentStates] = useState(defaultSettings.components);
  const [previewDevice, setPreviewDevice] = useState<'mall' | 'tablet' | 'kiosk'>('mall');
  const [pharmacyName, setPharmacyName] = useState('내 약국');
  const [, setConfigLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // 서버에서 설정 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getStoreConfig();
        if (cancelled) return;
        const cfg = data.storefrontConfig || {};
        if (cfg.template) setSelectedTemplate(cfg.template as string);
        if (cfg.theme) setSelectedTheme(cfg.theme as string);
        if (cfg.components) setComponentStates(prev => ({ ...prev, ...(cfg.components as Record<string, boolean>) }));
        if (data.organizationName) setPharmacyName(data.organizationName);
        setConfigLoaded(true);
      } catch {
        // 서버 연결 실패 시 기본값 사용
        setConfigLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 서버에 설정 저장
  const handleSave = useCallback(async () => {
    setSaveState('saving');
    try {
      await saveStoreConfig({
        template: selectedTemplate,
        theme: selectedTheme,
        components: componentStates,
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [selectedTemplate, selectedTheme, componentStates]);

  // 기본값으로 초기화
  const handleReset = useCallback(() => {
    setSelectedTemplate(defaultSettings.template);
    setSelectedTheme(defaultSettings.theme);
    setComponentStates(defaultSettings.components);
  }, []);

  // 컴포넌트 토글
  const toggleComponent = (componentId: string) => {
    if (!isOwner) return;
    const component = storeComponents.find(c => c.id === componentId);
    if (component?.required) return;

    setComponentStates(prev => ({
      ...prev,
      [componentId]: !prev[componentId as keyof typeof prev],
    }));
  };

  // 근무약사인 경우 안내
  if (!isOwner) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <Link to="/pharmacy" style={styles.backLink}>← 돌아가기</Link>
          <h1 style={styles.pageTitle}>내 약국 몰</h1>
        </header>
        <div style={styles.accessDenied}>
          <span style={styles.accessDeniedIcon}>🔒</span>
          <h2 style={styles.accessDeniedTitle}>접근 권한 없음</h2>
          <p style={styles.accessDeniedText}>
            매장 UI-UX 설정은 개설약사만 변경할 수 있습니다.
          </p>
          <Link to="/pharmacy" style={styles.backButton}>
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/pharmacy" style={styles.backLink}>← 돌아가기</Link>
          <div style={styles.headerMain}>
            <div style={styles.pharmacyInfo}>
              <h1 style={styles.pharmacyName}>{pharmacyName}</h1>
              <span style={styles.subLabel}>· 매장 UI-UX 관리</span>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 정책 고지 */}
      <div style={styles.policyNotice}>
        <span style={styles.policyIcon}>📋</span>
        <div style={styles.policyContent}>
          <strong>UI-UX 표준화 정책</strong>
          <p style={styles.policyText}>
            약국 매장 화면은 플랫폼에서 제공하는 템플릿과 테마를 기반으로 운영됩니다.
            템플릿 구조를 벗어나는 UI 변경은 별도 제작이 필요합니다.
          </p>
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* 좌측: 설정 패널 */}
        <div style={styles.settingsPanel}>
          {/* 템플릿 선택 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>템플릿 선택</h2>
            <p style={styles.sectionDesc}>페이지 레이아웃과 컴포넌트 배치 구조를 선택합니다.</p>
            <div style={styles.templateGrid}>
              {templates.map(template => (
                <div
                  key={template.id}
                  style={{
                    ...styles.templateCard,
                    borderColor: selectedTemplate === template.id ? colors.primary : colors.neutral200,
                    backgroundColor: selectedTemplate === template.id ? colors.primary + '08' : colors.white,
                  }}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div style={styles.templatePreview}>{template.preview}</div>
                  <div style={styles.templateInfo}>
                    <h3 style={styles.templateName}>{template.name}</h3>
                    <p style={styles.templateDesc}>{template.description}</p>
                  </div>
                  {selectedTemplate === template.id && (
                    <span style={styles.selectedBadge}>선택됨</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 테마 선택 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>테마 선택</h2>
            <p style={styles.sectionDesc}>색상과 스타일을 선택합니다. 즉시 반영됩니다.</p>
            <div style={styles.themeGrid}>
              {themes.map(theme => (
                <div
                  key={theme.id}
                  style={{
                    ...styles.themeCard,
                    borderColor: selectedTheme === theme.id ? theme.primaryColor : colors.neutral200,
                  }}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <div style={styles.themeColors}>
                    <span style={{ ...styles.colorDot, backgroundColor: theme.primaryColor }} />
                    <span style={{ ...styles.colorDot, backgroundColor: theme.accentColor }} />
                  </div>
                  <span style={styles.themeName}>{theme.name}</span>
                  {selectedTheme === theme.id && (
                    <span style={styles.themeCheck}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 컴포넌트 On/Off */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>컴포넌트 표시 설정</h2>
            <p style={styles.sectionDesc}>표시할 영역을 선택합니다. 순서 변경은 불가합니다.</p>
            <div style={styles.componentList}>
              {storeComponents.map(component => (
                <div
                  key={component.id}
                  style={{
                    ...styles.componentItem,
                    opacity: component.required ? 0.7 : 1,
                  }}
                >
                  <div style={styles.componentInfo}>
                    <span style={styles.componentName}>{component.name}</span>
                    <span style={styles.componentDesc}>{component.description}</span>
                    {component.required && (
                      <span style={styles.requiredBadge}>필수</span>
                    )}
                  </div>
                  <button
                    style={{
                      ...styles.toggleButton,
                      backgroundColor: componentStates[component.id as keyof typeof componentStates]
                        ? colors.primary
                        : colors.neutral300,
                    }}
                    onClick={() => toggleComponent(component.id)}
                    disabled={component.required}
                  >
                    <span style={{
                      ...styles.toggleKnob,
                      transform: componentStates[component.id as keyof typeof componentStates]
                        ? 'translateX(20px)'
                        : 'translateX(0)',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 우측: 미리보기 패널 */}
        <div style={styles.previewPanel}>
          <div style={styles.previewHeader}>
            <h2 style={styles.previewTitle}>미리보기</h2>
            <div style={styles.deviceTabs}>
              {devices.map(device => (
                <button
                  key={device.id}
                  style={{
                    ...styles.deviceTab,
                    backgroundColor: previewDevice === device.id ? colors.primary : colors.white,
                    color: previewDevice === device.id ? colors.white : colors.neutral600,
                  }}
                  onClick={() => setPreviewDevice(device.id as typeof previewDevice)}
                >
                  <span style={styles.deviceIcon}>{device.icon}</span>
                  <span>{device.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.previewFrame}>
            <div style={{
              ...styles.previewContent,
              ...(previewDevice === 'tablet' ? styles.tabletFrame : {}),
              ...(previewDevice === 'kiosk' ? styles.kioskFrame : {}),
            }}>
              {/* 미리보기 내용 */}
              <div style={styles.mockScreen}>
                <div style={{
                  ...styles.mockHeader,
                  backgroundColor: themes.find(t => t.id === selectedTheme)?.primaryColor,
                }}>
                  <span style={styles.mockLogo}>💊 {pharmacyName}</span>
                </div>
                <div style={styles.mockBody}>
                  {componentStates.banner && (
                    <div style={styles.mockBanner}>
                      <span>🏷️ 배너 영역</span>
                    </div>
                  )}
                  {componentStates.categories && (
                    <div style={styles.mockSection}>
                      <span>📂 카테고리</span>
                    </div>
                  )}
                  {componentStates.featured && (
                    <div style={styles.mockSection}>
                      <span>⭐ 추천 상품</span>
                    </div>
                  )}
                  {componentStates.promotion && (
                    <div style={styles.mockSection}>
                      <span>🎁 프로모션</span>
                    </div>
                  )}
                  {componentStates['best-sellers'] && (
                    <div style={styles.mockSection}>
                      <span>🔥 베스트셀러</span>
                    </div>
                  )}
                  {componentStates['pharmacy-info'] && (
                    <div style={styles.mockSection}>
                      <span>🏥 약국 소개</span>
                    </div>
                  )}
                </div>
                <div style={styles.mockFooter}>
                  <span style={styles.mockTemplateLabel}>
                    {templates.find(t => t.id === selectedTemplate)?.name} 템플릿
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div style={styles.actionButtons}>
            <button
              style={{
                ...styles.saveButton,
                opacity: saveState === 'saving' ? 0.7 : 1,
              }}
              onClick={handleSave}
              disabled={saveState === 'saving'}
            >
              {saveState === 'saving' ? '저장 중...' :
               saveState === 'saved' ? '저장 완료' :
               saveState === 'error' ? '저장 실패 — 다시 시도' :
               '변경사항 저장'}
            </button>
            <button style={styles.resetButton} onClick={handleReset}>
              기본값으로 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 표준 vs 유료 경계 안내 */}
      <div style={styles.boundaryNotice}>
        <div style={styles.boundarySection}>
          <h3 style={styles.boundaryTitle}>✅ 표준 범위 (기본 제공)</h3>
          <ul style={styles.boundaryList}>
            <li>템플릿 선택</li>
            <li>테마 선택</li>
            <li>컴포넌트 표시/숨김</li>
            <li>디바이스별 프리셋</li>
          </ul>
        </div>
        <div style={styles.boundaryDivider} />
        <div style={styles.boundarySection}>
          <h3 style={styles.boundaryTitlePaid}>💎 유료 커스텀</h3>
          <ul style={styles.boundaryList}>
            <li>템플릿 구조 변경</li>
            <li>신규 UI 컴포넌트</li>
            <li>레이아웃 재배치</li>
            <li>브랜드 전용 UI</li>
          </ul>
          <button style={styles.inquiryButton}>
            커스텀 문의 →
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },

  // Header
  header: {
    marginBottom: '24px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pharmacyInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  pharmacyName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '1rem',
    color: colors.neutral500,
    fontWeight: 500,
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Access Denied
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center',
  },
  accessDeniedIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  accessDeniedTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 8px',
  },
  accessDeniedText: {
    fontSize: '0.9375rem',
    color: colors.neutral500,
    margin: '0 0 24px',
  },
  backButton: {
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
  },

  // Policy Notice
  policyNotice: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.info}30`,
    marginBottom: '24px',
  },
  policyIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  policyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  policyText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    margin: 0,
    lineHeight: 1.5,
  },

  // Main Grid
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px',
    marginBottom: '32px',
  },

  // Settings Panel
  settingsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 4px',
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '0 0 16px',
  },

  // Template Grid
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  templateCard: {
    position: 'relative',
    padding: '16px',
    border: '2px solid',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templatePreview: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  templateInfo: {},
  templateName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  templateDesc: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  selectedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '10px',
    fontSize: '0.6875rem',
    fontWeight: 600,
  },

  // Theme Grid
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  themeCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    border: '2px solid',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  themeColors: {
    display: 'flex',
    gap: '6px',
  },
  colorDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
  },
  themeName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
  },
  themeCheck: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Component List
  componentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  componentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
  },
  componentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  componentName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  componentDesc: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  requiredBadge: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '2px 6px',
    backgroundColor: colors.warning + '20',
    color: colors.warning,
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 500,
  },
  toggleButton: {
    position: 'relative',
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  toggleKnob: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: colors.white,
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },

  // Preview Panel
  previewPanel: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: '100px',
    height: 'fit-content',
  },
  previewHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  previewTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  deviceTabs: {
    display: 'flex',
    gap: '8px',
  },
  deviceTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deviceIcon: {
    fontSize: '1rem',
  },
  previewFrame: {
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    padding: '16px',
    marginBottom: '16px',
  },
  previewContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    boxShadow: shadows.sm,
  },
  tabletFrame: {
    maxWidth: '280px',
    margin: '0 auto',
  },
  kioskFrame: {
    maxWidth: '200px',
    margin: '0 auto',
    minHeight: '300px',
  },

  // Mock Screen
  mockScreen: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '280px',
  },
  mockHeader: {
    padding: '12px 16px',
    color: colors.white,
  },
  mockLogo: {
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  mockBody: {
    flex: 1,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mockBanner: {
    padding: '20px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    fontSize: '0.8125rem',
    color: colors.neutral600,
  },
  mockSection: {
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  mockFooter: {
    padding: '8px 12px',
    backgroundColor: colors.neutral50,
    borderTop: `1px solid ${colors.neutral100}`,
    textAlign: 'center',
  },
  mockTemplateLabel: {
    fontSize: '0.6875rem',
    color: colors.neutral400,
  },

  // Action Buttons
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  saveButton: {
    padding: '12px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  resetButton: {
    padding: '12px',
    backgroundColor: 'transparent',
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    cursor: 'pointer',
  },

  // Boundary Notice
  boundaryNotice: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  boundarySection: {
    flex: 1,
  },
  boundaryDivider: {
    width: '1px',
    backgroundColor: colors.neutral200,
  },
  boundaryTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.success,
    margin: '0 0 12px',
  },
  boundaryTitlePaid: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.warning,
    margin: '0 0 12px',
  },
  boundaryList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.8,
  },
  inquiryButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: colors.warning + '15',
    color: colors.warning,
    border: `1px solid ${colors.warning}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
