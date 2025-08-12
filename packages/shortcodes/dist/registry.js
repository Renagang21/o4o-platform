/**
 * 숏코드 레지스트리 구현
 * 숏코드 정의를 저장하고 관리합니다.
 */
export class DefaultShortcodeRegistry {
    constructor() {
        this.shortcodes = new Map();
    }
    /**
     * 숏코드 등록
     */
    register(definition) {
        const { name, validate } = definition;
        // 이름 유효성 검사
        if (!name || typeof name !== 'string') {
            throw new Error('Shortcode name must be a non-empty string');
        }
        // 이름 형식 검사 (영문자, 숫자, 언더스코어, 하이픈만 허용)
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            throw new Error(`Invalid shortcode name: ${name}. Only alphanumeric characters, underscores, and hyphens are allowed.`);
        }
        // 중복 검사
        if (this.shortcodes.has(name)) {
            console.warn(`Shortcode "${name}" is already registered. It will be overwritten.`);
        }
        // 기본 속성 유효성 검사
        if (definition.defaultAttributes && validate) {
            if (!validate(definition.defaultAttributes)) {
                throw new Error(`Default attributes for shortcode "${name}" are invalid`);
            }
        }
        this.shortcodes.set(name, definition);
    }
    /**
     * 숏코드 제거
     */
    unregister(name) {
        this.shortcodes.delete(name);
    }
    /**
     * 숏코드 조회
     */
    get(name) {
        return this.shortcodes.get(name);
    }
    /**
     * 숏코드 존재 여부 확인
     */
    has(name) {
        return this.shortcodes.has(name);
    }
    /**
     * 모든 숏코드 반환
     */
    getAll() {
        return new Map(this.shortcodes);
    }
    /**
     * 레지스트리 초기화
     */
    clear() {
        this.shortcodes.clear();
    }
}
// 전역 레지스트리 인스턴스
export const globalRegistry = new DefaultShortcodeRegistry();
// 헬퍼 함수들
export const registerShortcode = (definition) => {
    globalRegistry.register(definition);
};
export const unregisterShortcode = (name) => {
    globalRegistry.unregister(name);
};
export const getShortcode = (name) => {
    return globalRegistry.get(name);
};
export const hasShortcode = (name) => {
    return globalRegistry.has(name);
};
