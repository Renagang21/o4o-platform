/**
 * Template Preset Definitions
 *
 * WO-O4O-TEMPLATE-APPLY-HOME-V1 (초기 구현)
 * WO-O4O-TEMPLATE-PRESET-DEFINITION-V1 (Preset 구조 승격)
 *
 * 구조:
 *   TemplatePreset = 메타데이터 + TemplateTokens
 *   templatePresets = 전체 preset 레지스트리
 *   templates = 실제 사용 tokens (templatePresets에서 파생)
 *
 * 사용법:
 *   import { templates, templatePresets } from '@o4o/shared-space-ui';
 *
 *   // 토큰 직접 사용 (기존 호환)
 *   const t = templates.kpa;
 *   <PageHero className={`${t.hero.bg} ${t.hero.border} ${t.hero.padding}`}>
 *
 *   // Preset 메타데이터 참조
 *   const preset = templatePresets.kpa;
 *   console.log(preset.name);        // 'KPA Professional'
 *   console.log(preset.category);    // 'professional'
 *
 * 원칙:
 *   - 기존 inline style 위에 "얹는" 방식 (덮어쓰기 아님)
 *   - 점진적으로 inline style → template className 전환 기반
 *   - Preset은 "선택 가능한 디자인 자산" — 구현이 아니라 선택
 */

// ─── Token Types ────────────────────────────────────────────

export type TemplateKey = 'kpa' | 'glycopharm' | 'kcosmetics' | 'referenceA';

export interface TemplateTokens {
  hero: {
    bg: string;
    border: string;
    padding: string;
  };
  card: {
    radius: string;
    shadow: string;
  };
  section: {
    spacing: string;
  };
  /** WO-O4O-TEMPLATE-BUTTON-STANDARD-V1 */
  button?: {
    radius: string;
  };
  /** WO-O4O-TEMPLATE-ICON-WRAPPER-V1 */
  icon?: {
    wrapper: string;
    icon: string;
  };
}

// ─── Preset Types ───────────────────────────────────────────

export type PresetCategory = 'professional' | 'dashboard' | 'brand' | 'experimental';

export interface TemplatePreset {
  key: TemplateKey;
  name: string;
  description: string;
  category: PresetCategory;
  tokens: TemplateTokens;
}

// ─── Preset Registry ────────────────────────────────────────

export const templatePresets: Record<TemplateKey, TemplatePreset> = {
  kpa: {
    key: 'kpa',
    name: 'KPA Professional',
    // WO-O4O-KPA-HERO-TONE-FIX-V1: bg-bg-secondary → bg-primary-50, border-primary-100
    description: '전문기관형 — 절제된 색상, border 중심, 그림자 없음',
    category: 'professional',
    tokens: {
      hero: {
        bg: 'bg-primary-50',
        border: 'border border-primary-100',
        padding: 'py-16',
      },
      card: {
        radius: 'rounded-md',
        shadow: 'shadow-none',
      },
      section: {
        spacing: 'mb-16',
      },
      button: {
        radius: 'rounded-md',
      },
      icon: {
        wrapper: '',
        icon: 'text-primary',
      },
    },
  },

  glycopharm: {
    key: 'glycopharm',
    name: 'Health Dashboard',
    description: '데이터 중심 관리형 — 가벼운 그림자, 아이콘 래퍼, 컴팩트 간격',
    category: 'dashboard',
    tokens: {
      hero: {
        bg: 'bg-primary-50',
        border: 'border-b border-border',
        padding: 'py-10',
      },
      card: {
        radius: 'rounded-lg',
        shadow: 'shadow-sm',
      },
      section: {
        spacing: 'mb-12',
      },
      button: {
        radius: 'rounded-lg',
      },
      icon: {
        wrapper: 'bg-primary-50 rounded-lg w-9 h-9',
        icon: 'text-primary',
      },
    },
  },

  kcosmetics: {
    key: 'kcosmetics',
    name: 'Beauty Brand',
    description: '브랜드 중심 — 부드러운 곡선, 중간 그림자, pill 버튼',
    category: 'brand',
    tokens: {
      hero: {
        bg: 'bg-primary-50',
        border: 'border border-primary-100',
        padding: 'py-20',
      },
      card: {
        radius: 'rounded-xl',
        shadow: 'shadow-md',
      },
      section: {
        spacing: 'mb-20',
      },
      button: {
        radius: 'rounded-full',
      },
      icon: {
        wrapper: 'bg-primary-50 rounded-full w-11 h-11',
        icon: 'text-primary',
      },
    },
  },

  /**
   * WO-O4O-REFERENCE-DESIGN-IMPORT-V1
   * 원본: Stripe / Linear / Vercel 디자인 패턴 합성 (light-mode)
   */
  referenceA: {
    key: 'referenceA',
    name: 'Premium SaaS',
    description: 'SaaS 스타일 — gradient hero, 큰 카드 라운딩, 강한 그림자',
    category: 'experimental',
    tokens: {
      hero: {
        bg: 'bg-gradient-to-r from-primary-50 to-primary-100',
        border: '',
        padding: 'py-24',
      },
      card: {
        radius: 'rounded-2xl',
        shadow: 'shadow-lg',
      },
      section: {
        spacing: 'mb-24',
      },
      button: {
        radius: 'rounded-full',
      },
      icon: {
        wrapper: 'bg-primary-50 rounded-full w-12 h-12',
        icon: 'text-primary',
      },
    },
  },
};

// ─── Runtime Token Map (backward compatible) ────────────────
//
// 기존 소비자:
//   import { templates } from '@o4o/shared-space-ui';
//   <TemplateProvider template={templates[config.template]}>
//
// 이 export는 templatePresets에서 tokens만 추출하여 동일 형태를 유지한다.

export const templates: Record<TemplateKey, TemplateTokens> = Object.fromEntries(
  Object.entries(templatePresets).map(([k, v]) => [k, v.tokens]),
) as Record<TemplateKey, TemplateTokens>;
