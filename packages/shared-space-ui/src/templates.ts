/**
 * Home Template Tokens
 *
 * WO-O4O-TEMPLATE-APPLY-HOME-V1
 *
 * 3개 서비스(KPA / GlycoPharm / K-Cosmetics) Home에 적용되는
 * 디자인 토큰 className 조합.
 *
 * 사용법:
 *   import { templates } from '@o4o/shared-space-ui';
 *   const t = templates.kpa;
 *   <PageHero className={`${t.hero.bg} ${t.hero.border} ${t.hero.padding}`}>
 *
 * 원칙:
 *   - 기존 inline style 위에 "얹는" 방식 (덮어쓰기 아님)
 *   - 점진적으로 inline style → template className 전환 기반
 */

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

export const templates: Record<TemplateKey, TemplateTokens> = {
  kpa: {
    hero: {
      bg: 'bg-bg-secondary',
      border: 'border border-border',
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

  glycopharm: {
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

  kcosmetics: {
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

  /**
   * WO-O4O-REFERENCE-DESIGN-IMPORT-V1
   *
   * Reference preset: "Premium SaaS Landing"
   * 원본: Stripe / Linear / Vercel 디자인 패턴 합성 (light-mode)
   *
   * 특징:
   *  - Gradient hero (기존 preset 중 유일)
   *  - Borderless hero (깔끔한 인상)
   *  - 2xl 라운딩 + lg 그림자 (premium 카드)
   *  - 넉넉한 섹션 간격 (mb-24)
   *  - 대형 원형 아이콘 래퍼
   */
  referenceA: {
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
};
