/**
 * Store Theme Context
 *
 * CSS Variable 기반 테마 시스템
 * Theme 변경 시 즉시 반영 (리로드 불필요)
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { StoreTheme, StoreThemeConfig, ThemeColors, ThemeFonts } from '@/types/store';
import { DEFAULT_STORE_THEME, DEVICE_OPTIMIZED_THEME } from '@/types/store';
import type { StoreMode } from '@/contexts/StoreModeContext';

// ============================================================================
// Theme Presets
// ============================================================================

/** Neutral 테마 (GlycoPharm 기본) - 중립적, 상업적, 범용 */
const NEUTRAL_COLORS: ThemeColors = {
  primary: '#3b82f6',      // Blue-500
  primaryHover: '#2563eb', // Blue-600
  secondary: '#64748b',    // Slate-500
  accent: '#f59e0b',       // Amber-500
  background: '#f8fafc',   // Slate-50
  surface: '#ffffff',
  text: '#1e293b',         // Slate-800
  textMuted: '#64748b',    // Slate-500
  border: '#e2e8f0',       // Slate-200
  success: '#22c55e',      // Green-500
  warning: '#f59e0b',      // Amber-500
  error: '#ef4444',        // Red-500
};

/** Clean 테마 (약사회 계열) - 신뢰/공공/정보 중심 */
const CLEAN_COLORS: ThemeColors = {
  primary: '#0d9488',      // Teal-600
  primaryHover: '#0f766e', // Teal-700
  secondary: '#475569',    // Slate-600
  accent: '#0891b2',       // Cyan-600
  background: '#f0fdfa',   // Teal-50
  surface: '#ffffff',
  text: '#134e4a',         // Teal-900
  textMuted: '#5eead4',    // Teal-300 (adjusted for readability)
  border: '#99f6e4',       // Teal-200
  success: '#10b981',      // Emerald-500
  warning: '#f59e0b',      // Amber-500
  error: '#dc2626',        // Red-600
};

/**
 * Modern 테마 (키오스크/태블릿 최적화) - 디지털 친화, 높은 가독성
 * 용도: Kiosk Mode, Tablet Mode
 */
const MODERN_COLORS: ThemeColors = {
  primary: '#4f46e5',      // Indigo-600
  primaryHover: '#4338ca', // Indigo-700
  secondary: '#64748b',    // Slate-500
  accent: '#06b6d4',       // Cyan-500
  background: '#f8fafc',   // Slate-50
  surface: '#ffffff',
  text: '#0f172a',         // Slate-900 (높은 대비)
  textMuted: '#475569',    // Slate-600
  border: '#e2e8f0',       // Slate-200
  success: '#10b981',      // Emerald-500
  warning: '#f59e0b',      // Amber-500
  error: '#ef4444',        // Red-500
};

/**
 * Professional 테마 (운영자 권장) - 전문적, 의료 이미지
 * 용도: 일반 소비자 웹 스토어 기본값
 */
const PROFESSIONAL_COLORS: ThemeColors = {
  primary: '#1e40af',      // Blue-800 (진한 네이비)
  primaryHover: '#1e3a8a', // Blue-900
  secondary: '#475569',    // Slate-600
  accent: '#64748b',       // Slate-500 (차분한 그레이)
  background: '#fafafa',   // Neutral-50 (오프화이트)
  surface: '#ffffff',
  text: '#1e293b',         // Slate-800
  textMuted: '#64748b',    // Slate-500
  border: '#e5e7eb',       // Gray-200
  success: '#059669',      // Emerald-600
  warning: '#d97706',      // Amber-600
  error: '#dc2626',        // Red-600
};

const DEFAULT_FONTS: ThemeFonts = {
  heading: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

/** 테마 프리셋 */
export const THEME_PRESETS: Record<StoreTheme, StoreThemeConfig> = {
  neutral: {
    theme: 'neutral',
    colors: NEUTRAL_COLORS,
    fonts: DEFAULT_FONTS,
    buttonRadius: 'md',
    cardRadius: 'lg',
    shadowIntensity: 'subtle',
  },
  clean: {
    theme: 'clean',
    colors: { ...CLEAN_COLORS, textMuted: '#64748b' }, // Fix textMuted for readability
    fonts: DEFAULT_FONTS,
    buttonRadius: 'sm',
    cardRadius: 'md',
    shadowIntensity: 'none',
  },
  modern: {
    theme: 'modern',
    colors: MODERN_COLORS,
    fonts: DEFAULT_FONTS,
    buttonRadius: 'md',
    cardRadius: 'md',
    shadowIntensity: 'subtle',
  },
  professional: {
    theme: 'professional',
    colors: PROFESSIONAL_COLORS,
    fonts: DEFAULT_FONTS,
    buttonRadius: 'sm',
    cardRadius: 'sm',
    shadowIntensity: 'none',
  },
};

// ============================================================================
// Context
// ============================================================================

interface StoreThemeContextValue {
  /** 현재 적용 중인 테마 */
  theme: StoreTheme;
  /** 테마 설정 */
  config: StoreThemeConfig;
  /** 테마 변경 (StoreMode가 kiosk/tablet이면 무시됨) */
  setTheme: (theme: StoreTheme) => void;
  /** 원래 선택된 테마 (override 이전) */
  originalTheme: StoreTheme;
  /** 테마가 StoreMode에 의해 override되었는지 여부 */
  isThemeOverridden: boolean;
}

const StoreThemeContext = createContext<StoreThemeContextValue | null>(null);

// ============================================================================
// CSS Variable Injection
// ============================================================================

/**
 * 스토어 모드별 폰트 스케일
 * - consumer: 1 (기본)
 * - tablet: 1.1 (약간 확대)
 * - kiosk: 1.25 (접근성 향상)
 */
const FONT_SCALE_BY_MODE: Record<StoreMode, number> = {
  consumer: 1,
  tablet: 1.1,
  kiosk: 1.25,
};

function applyThemeToCSSVariables(config: StoreThemeConfig, storeMode?: StoreMode): void {
  const root = document.documentElement;
  const { colors, fonts, buttonRadius, cardRadius, shadowIntensity } = config;

  // Colors
  root.style.setProperty('--store-color-primary', colors.primary);
  root.style.setProperty('--store-color-primary-hover', colors.primaryHover);
  root.style.setProperty('--store-color-secondary', colors.secondary);
  root.style.setProperty('--store-color-accent', colors.accent);
  root.style.setProperty('--store-color-background', colors.background);
  root.style.setProperty('--store-color-surface', colors.surface);
  root.style.setProperty('--store-color-text', colors.text);
  root.style.setProperty('--store-color-text-muted', colors.textMuted);
  root.style.setProperty('--store-color-border', colors.border);
  root.style.setProperty('--store-color-success', colors.success);
  root.style.setProperty('--store-color-warning', colors.warning);
  root.style.setProperty('--store-color-error', colors.error);

  // Fonts
  root.style.setProperty('--store-font-heading', fonts.heading);
  root.style.setProperty('--store-font-body', fonts.body);
  root.style.setProperty('--store-font-mono', fonts.mono);

  // Font Scale (키오스크/태블릿 접근성)
  const fontScale = storeMode ? FONT_SCALE_BY_MODE[storeMode] : 1;
  root.style.setProperty('--store-font-scale', fontScale.toString());
  root.style.setProperty('--store-font-scale-kiosk', FONT_SCALE_BY_MODE.kiosk.toString());
  root.style.setProperty('--store-font-scale-tablet', FONT_SCALE_BY_MODE.tablet.toString());

  // Border Radius
  const radiusMap = { none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', full: '9999px' };
  root.style.setProperty('--store-button-radius', radiusMap[buttonRadius]);
  root.style.setProperty('--store-card-radius', radiusMap[cardRadius] || radiusMap.md);

  // Shadows
  const shadowMap = {
    none: 'none',
    subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    strong: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  };
  root.style.setProperty('--store-shadow', shadowMap[shadowIntensity]);
}

// ============================================================================
// Provider
// ============================================================================

interface StoreThemeProviderProps {
  children: ReactNode;
  /** 약국이 선택한 테마 */
  initialTheme?: StoreTheme;
  /** 스토어 모드 (kiosk/tablet이면 테마 override) */
  storeMode?: StoreMode;
  onThemeChange?: (theme: StoreTheme) => void;
}

/**
 * 스토어 모드에 따라 테마를 override해야 하는지 확인
 * Kiosk/Tablet 모드에서는 modern 테마를 강제 적용
 */
function shouldOverrideTheme(mode?: StoreMode): boolean {
  return mode === 'kiosk' || mode === 'tablet';
}

export function StoreThemeProvider({
  children,
  initialTheme = DEFAULT_STORE_THEME,
  storeMode,
  onThemeChange,
}: StoreThemeProviderProps) {
  // 원래 선택된 테마 (약국 설정)
  const [originalTheme, setOriginalTheme] = React.useState<StoreTheme>(initialTheme);

  // StoreMode에 의한 override 여부
  const isThemeOverridden = shouldOverrideTheme(storeMode);

  // 실제 적용될 테마 (override 시 DEVICE_OPTIMIZED_THEME 사용)
  const effectiveTheme = isThemeOverridden ? DEVICE_OPTIMIZED_THEME : originalTheme;

  const config = useMemo(() => THEME_PRESETS[effectiveTheme], [effectiveTheme]);

  // Apply CSS variables when theme or storeMode changes
  useEffect(() => {
    applyThemeToCSSVariables(config, storeMode);
  }, [config, storeMode]);

  // 테마 변경 (override 상태에서는 originalTheme만 업데이트, 실제 적용은 되지 않음)
  const setTheme = (newTheme: StoreTheme) => {
    setOriginalTheme(newTheme);
    if (!isThemeOverridden) {
      onThemeChange?.(newTheme);
    }
  };

  const value = useMemo(
    () => ({
      theme: effectiveTheme,
      config,
      setTheme,
      originalTheme,
      isThemeOverridden,
    }),
    [effectiveTheme, config, originalTheme, isThemeOverridden]
  );

  return (
    <StoreThemeContext.Provider value={value}>
      {children}
    </StoreThemeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useStoreTheme(): StoreThemeContextValue {
  const context = useContext(StoreThemeContext);
  if (!context) {
    throw new Error('useStoreTheme must be used within a StoreThemeProvider');
  }
  return context;
}

// React import for useState
import React from 'react';
