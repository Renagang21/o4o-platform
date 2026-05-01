/**
 * TemplateContext / TemplateProvider / useTemplate
 * WO-O4O-TEMPLATE-PROVIDER-V1
 *
 * Layout 수준에서 template를 주입하면 하위 PageHero / PageSection이
 * 자동으로 소비한다. 개별 template prop은 Context보다 우선한다.
 *
 * 사용법 (서비스 App root):
 *   import { TemplateProvider } from '@o4o/ui';
 *   import { templates } from '@o4o/shared-space-ui';
 *   <TemplateProvider template={templates.kpa}>
 *     <App />
 *   </TemplateProvider>
 *
 * 원칙:
 *   - @o4o/ui 내부에 위치하여 순환 의존 방지
 *   - 구조적 타이핑으로 shared-space-ui의 TemplateTokens와 호환
 *   - template prop > Context > 기본값 (3-tier fallback)
 */

import { createContext, useContext, ReactNode } from 'react';
import type { HeroTemplate, SectionTemplate } from './Section';

// ─── Template Tokens (structural typing — @o4o/shared-space-ui와 호환) ─────

export interface CardTemplate {
  radius: string;
  shadow: string;
}

/** WO-O4O-TEMPLATE-BUTTON-STANDARD-V1 */
export interface ButtonTemplate {
  radius: string;
}

/** WO-O4O-TEMPLATE-ICON-WRAPPER-V1 */
export interface IconTemplate {
  wrapper: string;
  icon: string;
}

/** WO-O4O-TEMPLATE-RESPONSIVE-LAYOUT-V1 */
export interface LayoutTemplate {
  container: string;
  grid: string;
  gap: string;
}

export interface TemplateTokens {
  hero: HeroTemplate;
  card: CardTemplate;
  section: SectionTemplate;
  button?: ButtonTemplate;
  icon?: IconTemplate;
  layout?: LayoutTemplate;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const TemplateContext = createContext<TemplateTokens | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export interface TemplateProviderProps {
  template: TemplateTokens;
  children: ReactNode;
}

export function TemplateProvider({ template, children }: TemplateProviderProps) {
  return (
    <TemplateContext.Provider value={template}>
      {children}
    </TemplateContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/** Context에서 template를 가져온다. Provider 없으면 null 반환. */
export function useTemplate(): TemplateTokens | null {
  return useContext(TemplateContext);
}
