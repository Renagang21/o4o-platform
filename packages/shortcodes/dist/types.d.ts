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
 * 숏코드 속성 정의
 */
export interface ShortcodeAttributeDefinition {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: any;
}
/**
 * 숏코드 정의
 */
export interface ShortcodeDefinition {
    name: string;
    component: ShortcodeComponent;
    description?: string;
    defaultAttributes?: ShortcodeAttributes;
    attributes?: Record<string, ShortcodeAttributeDefinition>;
    validate?: (attributes: ShortcodeAttributes) => boolean;
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
//# sourceMappingURL=types.d.ts.map