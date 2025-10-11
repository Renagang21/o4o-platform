/**
 * Shortcode Registry Types
 * AI 페이지 생성을 위한 shortcode 정보 관리
 */

export interface ShortcodeParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  description: string;
  options?: string[]; // enum 값들
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ShortcodeMigration {
  version: string;
  description: string;
  migrate?: string; // 마이그레이션 함수 설명 (실행은 향후 구현)
}

export interface ShortcodeInfo {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, ShortcodeParameter>;
  examples: string[];
  version: string;
  tags: string[];
  deprecated?: boolean;
  replacedBy?: string;
  migrations?: ShortcodeMigration[];
  aiPrompts?: string[]; // AI가 이 shortcode를 사용할 때의 힌트
}

export interface ShortcodeCategory {
  name: string;
  description: string;
  icon?: string;
  priority: number; // 정렬 우선순위
}

export interface ShortcodeAIReference {
  name: string;
  usage: string;
  description: string;
  parameters: string;
  examples: string[];
  category: string;
  tags: string[];
  aiPrompts: string[];
}

export interface ShortcodeRegistryResponse {
  total: number;
  categories: ShortcodeCategory[];
  shortcodes: ShortcodeAIReference[];
  schemaVersion: string; // 레지스트리 스키마 버전
  lastUpdated: string;
}