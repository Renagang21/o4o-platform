import { useState } from 'react';
import type { ThemeConfig } from '../types';

// 기본 테마 설정
const defaultTheme: ThemeConfig = {
  name: 'Default Theme',
  version: '1.0.0',
  colors: {
    primary: '#007cba',
    secondary: '#6c757d',
    accent: '#28a745',
    background: '#ffffff',
    text: '#1e1e1e',
    palette: [
      '#000000',
      '#ffffff',
      '#007cba',
      '#28a745',
      '#dc3545',
      '#ffc107',
      '#6c757d',
      '#17a2b8'
    ]
  },
  typography: {
    fontFamily: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      code: 'Consolas, Monaco, "Andale Mono", monospace'
    },
    fontSize: {
      base: '16px',
      scale: 1.25
    },
    lineHeight: {
      body: 1.6,
      heading: 1.2
    }
  },
  layout: {
    contentWidth: '840px',
    wideWidth: '1100px',
    fullWidth: '100%'
  },
  blocks: {
    allowedBlocks: [
      'paragraph',
      'heading',
      'image',
      'list',
      'quote',
      'button',
      'columns',
      'spacer'
    ]
  },
  spacing: {
    unit: 'px',
    scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
  }
};

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // 테마 로드
  const loadTheme = async () => {
    setLoading(true);
    try {
      // 실제 구현에서는 API 호출 또는 theme.json 파일 로드
      // const response = await fetch(`/themes/${themeId}/theme.json`);
      // const themeData = await response.json();
      
      // 지금은 기본 테마 사용
      setTheme(defaultTheme);
      
      // CSS 변수 적용
      applyThemeStyles(defaultTheme);
    } catch (error) {
      console.error('Failed to load theme:', error);
      setTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  // CSS 변수로 테마 스타일 적용
  const applyThemeStyles = (theme: ThemeConfig) => {
    const root = document.documentElement;
    
    // 색상 변수
    if (theme.colors) {
      root.style.setProperty('--theme-color-primary', theme.colors.primary || '#007cba');
      root.style.setProperty('--theme-color-secondary', theme.colors.secondary || '#6c757d');
      root.style.setProperty('--theme-color-accent', theme.colors.accent || '#28a745');
      root.style.setProperty('--theme-color-background', theme.colors.background || '#ffffff');
      root.style.setProperty('--theme-color-text', theme.colors.text || '#1e1e1e');
    }
    
    // 타이포그래피 변수
    if (theme.typography) {
      root.style.setProperty('--theme-font-body', theme.typography.fontFamily?.body || 'sans-serif');
      root.style.setProperty('--theme-font-heading', theme.typography.fontFamily?.heading || 'sans-serif');
      root.style.setProperty('--theme-font-size-base', theme.typography.fontSize?.base || '16px');
      root.style.setProperty('--theme-line-height-body', String(theme.typography.lineHeight?.body || 1.6));
      root.style.setProperty('--theme-line-height-heading', String(theme.typography.lineHeight?.heading || 1.2));
    }
    
    // 레이아웃 변수
    if (theme.layout) {
      root.style.setProperty('--theme-content-width', theme.layout.contentWidth || '840px');
      root.style.setProperty('--theme-wide-width', theme.layout.wideWidth || '1100px');
    }
  };

  // 테마 업데이트
  const updateTheme = (updates: Partial<ThemeConfig>) => {
    if (!theme) return;
    
    const updatedTheme = { ...theme, ...updates };
    setTheme(updatedTheme);
    applyThemeStyles(updatedTheme);
  };

  return {
    theme,
    loading,
    loadTheme,
    updateTheme
  };
};