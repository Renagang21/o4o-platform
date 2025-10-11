/**
 * Block Registry Types
 * AI 페이지 생성을 위한 블록 정보 관리
 */

export interface BlockAttribute {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  description?: string;
  enum?: string[]; // enum 값들
}

export interface BlockMigration {
  version: string;
  description: string;
  migrate?: string; // 마이그레이션 함수 설명 (실행은 향후 구현)
}

export interface BlockInfo {
  name: string;
  title: string;
  description: string;
  category: string;
  attributes: Record<string, BlockAttribute>;
  example: {
    json: string; // JSON 예시
    text?: string; // 텍스트 설명
  };
  version: string;
  tags: string[];
  deprecated?: boolean;
  replacedBy?: string;
  migrations?: BlockMigration[];
  aiPrompts?: string[]; // AI가 이 블록을 사용할 때의 힌트
  supports?: {
    html?: boolean;
    className?: boolean;
    anchor?: boolean;
    align?: boolean;
    [key: string]: any;
  };
}

export interface BlockCategory {
  name: string;
  title: string;
  icon?: string;
  priority: number; // 정렬 우선순위
}

export interface BlockAIReference {
  name: string;
  title: string;
  description: string;
  category: string;
  attributes: Record<string, BlockAttribute>;
  example: {
    json: string;
    text?: string;
  };
  version: string;
  tags: string[];
  aiPrompts: string[];
  deprecated?: boolean;
  replacedBy?: string;
}

export interface BlockRegistryResponse {
  total: number;
  categories: BlockCategory[];
  blocks: BlockAIReference[];
  schemaVersion: string; // 레지스트리 스키마 버전
  lastUpdated: string;
}
