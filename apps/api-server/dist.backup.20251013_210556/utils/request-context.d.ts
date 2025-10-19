import { Request } from 'express';
/**
 * 요청에서 서브도메인 추출
 * @param req Express Request
 * @returns 서브도메인 (예: 'shop', 'forum') 또는 null (메인 도메인)
 */
export declare function extractSubdomain(req: Request): string | null;
/**
 * 요청에서 경로 prefix 추출
 * @param path 경로 문자열 (예: '/seller1/products')
 * @returns 경로 prefix (예: '/seller1') 또는 null
 */
export declare function extractPathPrefix(path: string): string | null;
/**
 * 요청 컨텍스트 정보 추출
 * @param req Express Request
 * @returns 서브도메인, 경로 prefix 정보
 */
export declare function extractRequestContext(req: Request): {
    subdomain: string;
    path: string;
    pathPrefix: string;
};
//# sourceMappingURL=request-context.d.ts.map