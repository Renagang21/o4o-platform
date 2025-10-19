import { JwtPayload } from '../types/email-auth';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateAccessToken: (payload: JwtPayload) => string;
export declare const generateRefreshToken: (userId: string) => string;
export declare const verifyAccessToken: (token: string) => JwtPayload;
export declare const verifyRefreshToken: (token: string) => {
    userId: string;
};
export declare const generateRandomToken: (length?: number) => string;
export declare const generateVerificationCode: () => string;
export declare const validatePasswordStrength: (password: string) => {
    valid: boolean;
    errors: string[];
};
export declare const validateEmail: (email: string) => boolean;
export declare const getTokenExpiryDate: (expiresIn?: string) => Date;
export declare const getRateLimitKey: (identifier: string, action: string) => string;
//# sourceMappingURL=auth.utils.d.ts.map