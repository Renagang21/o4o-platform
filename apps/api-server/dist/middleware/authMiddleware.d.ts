import { Request, Response, NextFunction } from 'express';
import { UserRole, AuthRequest } from '../types/auth';
export declare class AuthMiddleware {
    private userRepository;
    private betaUserRepository;
    verifyToken: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    verifyBetaUser: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    requireRole: (roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    requireManagerOrAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    requireAnalyticsAccess: (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    requireSystemAccess: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    requireReportsAccess: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    requireRealTimeAccess: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    /**
     * JWT 토큰 검증 미들웨어 (새 SSO 시스템)
     */
    authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    /**
     * 역할 기반 접근 제어 미들웨어 (새 SSO 시스템)
     */
    requireRoles: (allowedRoles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    /**
     * 권한 기반 접근 제어 미들웨어 (새 SSO 시스템)
     */
    requirePermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    /**
     * 도메인별 접근 제어 미들웨어 (새 SSO 시스템)
     */
    requireDomain: (allowedDomains: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
    /**
     * 옵셔널 인증 미들웨어 (새 SSO 시스템)
     */
    optionalTokenAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * API 카테고리별 권한 매트릭스
     */
    private API_PERMISSIONS;
    /**
     * API 카테고리별 접근 제어 (새 SSO 시스템)
     */
    requireApiAccess: (category: keyof typeof this.API_PERMISSIONS) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
}
export declare const authMiddleware: AuthMiddleware;
export declare const roleGuard: (allowedRoles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=authMiddleware.d.ts.map