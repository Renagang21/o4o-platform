import { ReactElement, ComponentType } from 'react';

/**
 * 숏코드 속성 타입
 */
export type ShortcodeAttributes = Record<string, string | number | boolean>;

/**
 * 숏코드 컴포넌트가 받을 props
 */
export interface ShortcodeProps {
  attributes: ShortcodeAttributes;
  content?: string;
  context?: any;
}

/**
 * 숏코드 컴포넌트 타입
 */
export type ShortcodeComponent = ComponentType<ShortcodeProps>;

/**
 * 숏코드 필드 타입 (Phase SC-3: UI 편집기용 확장)
 */
export type ShortcodeFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea';

/**
 * 숏코드 필드 옵션 (select 타입용)
 */
export interface ShortcodeFieldOption {
  label: string;
  value: string;
}

/**
 * 숏코드 속성 정의
 */
export interface ShortcodeAttributeDefinition {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: any;
}

/**
 * 숏코드 필드 정의 (Phase SC-3: UI 편집기용 확장)
 */
export interface ShortcodeFieldDefinition {
  name: string;                             // 속성 키 (예: "tab")
  label: string;                            // UI 레이블 (예: "탭 선택")
  type: ShortcodeFieldType;
  required?: boolean;
  helpText?: string;                        // 도움말 텍스트
  options?: ShortcodeFieldOption[];         // select일 경우 선택지
  defaultValue?: string | number | boolean;
  placeholder?: string;                     // 입력 필드 플레이스홀더
}

/**
 * 숏코드 정의 (Phase SC-3: UI 메타데이터 추가)
 */
export interface ShortcodeDefinition {
  name: string;
  component: ShortcodeComponent;
  description?: string;
  defaultAttributes?: ShortcodeAttributes;
  attributes?: Record<string, ShortcodeAttributeDefinition>;
  validate?: (attributes: ShortcodeAttributes) => boolean;

  // Phase SC-3: UI 편집기용 메타데이터
  label?: string;                           // 에디터 드롭다운에 표시할 이름
  category?: string;                        // 카테고리 (예: "Dropshipping", "Commerce", "Layout")
  fields?: ShortcodeFieldDefinition[];      // UI 편집기용 필드 정의
}

/**
 * 파싱된 숏코드 정보
 */
export interface ParsedShortcode {
  fullMatch: string;
  name: string;
  attributes: ShortcodeAttributes;
  content?: string;
  isSelfClosing: boolean;
}

/**
 * 숏코드 레지스트리 인터페이스
 */
export interface ShortcodeRegistry {
  register(definition: ShortcodeDefinition): void;
  unregister(name: string): void;
  get(name: string): ShortcodeDefinition | undefined;
  has(name: string): boolean;
  getAll(): Map<string, ShortcodeDefinition>;
}

/**
 * 숏코드 파서 인터페이스
 */
export interface ShortcodeParser {
  parse(content: string): ParsedShortcode[];
  parseOne(content: string): ParsedShortcode | null;
}

/**
 * 숏코드 렌더러 인터페이스
 */
export interface ShortcodeRenderer {
  render(content: string, context?: any): ReactElement | null;
  renderShortcode(shortcode: ParsedShortcode, context?: any): ReactElement | null;
}