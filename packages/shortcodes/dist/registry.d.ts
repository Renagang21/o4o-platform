import { ShortcodeRegistry, ShortcodeDefinition } from './types';
/**
 * 숏코드 레지스트리 구현
 * 숏코드 정의를 저장하고 관리합니다.
 */
export declare class DefaultShortcodeRegistry implements ShortcodeRegistry {
    private shortcodes;
    constructor();
    /**
     * 숏코드 등록
     */
    register(definition: ShortcodeDefinition): void;
    /**
     * 숏코드 제거
     */
    unregister(name: string): void;
    /**
     * 숏코드 조회
     */
    get(name: string): ShortcodeDefinition | undefined;
    /**
     * 숏코드 존재 여부 확인
     */
    has(name: string): boolean;
    /**
     * 모든 숏코드 반환
     */
    getAll(): Map<string, ShortcodeDefinition>;
    /**
     * 레지스트리 초기화
     */
    clear(): void;
}
export declare const globalRegistry: DefaultShortcodeRegistry;
export declare const registerShortcode: (definition: ShortcodeDefinition) => void;
export declare const unregisterShortcode: (name: string) => void;
export declare const getShortcode: (name: string) => ShortcodeDefinition | undefined;
export declare const hasShortcode: (name: string) => boolean;
//# sourceMappingURL=registry.d.ts.map