export declare class LoginSecurityService {
    static isLoginAllowed(...args: any[]): {
        allowed: boolean;
        reason: string;
    };
    static recordLoginAttempt(...args: any[]): void;
    static clearOldLoginAttempts(...args: any[]): number;
    static getSecurityMetrics(...args: any[]): {};
    static getRecentLoginAttempts(...args: any[]): any[];
    static getLoginAttemptsByIp(...args: any[]): any[];
    static unlockAccount(...args: any[]): boolean;
    static lockAccount(...args: any[]): boolean;
    static resetLoginAttempts(...args: any[]): boolean;
}
export declare const loginSecurityService: LoginSecurityService;
//# sourceMappingURL=LoginSecurityService.d.ts.map