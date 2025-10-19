/**
 * Environment Variable Validator
 * 필수 환경 변수를 체크하고 기본값을 설정합니다.
 */
declare class EnvironmentValidator {
    private env;
    private requiredVars;
    private optionalVars;
    constructor();
    private validate;
    private setDefaults;
    private logConfiguration;
    /**
     * Get environment variable with type safety
     */
    get<T = string>(key: string): T;
    get<T = string>(key: string, defaultValue: T): T;
    /**
     * Get string value
     */
    getString(key: string, defaultValue?: string): string;
    /**
     * Get number value
     */
    getNumber(key: string, defaultValue?: number): number;
    /**
     * Get boolean value
     */
    getBoolean(key: string, defaultValue?: boolean): boolean;
    /**
     * Check if environment is development
     */
    isDevelopment(): boolean;
    /**
     * Check if environment is production
     */
    isProduction(): boolean;
    /**
     * Check if environment is test
     */
    isTest(): boolean;
}
export declare const env: EnvironmentValidator;
export {};
//# sourceMappingURL=env-validator.d.ts.map