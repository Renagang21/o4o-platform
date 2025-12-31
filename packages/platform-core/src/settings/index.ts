/**
 * Platform Settings Stub
 * 
 * Settings Schema v0.1 및 Storage Strategy v0.2 기준으로
 * 설정값을 참조하는 임시 어댑터
 * 
 * 현재는 ENV 또는 하드코딩 기본값을 반환하지만,
 * 향후 DB 구현 시 이 파일만 수정하면 됨
 * 
 * @see docs/_platform/settings-schema-v0.1.md
 * @see docs/_platform/settings-storage-strategy-v0.2.md
 */

export class PlatformSettings {
    // ========================================
    // Platform.Domain
    // ========================================

    /**
     * 플랫폼 기본 도메인
     * @default 'neture.co.kr'
     */
    static get domain(): string {
        return process.env.PLATFORM_DOMAIN || 'neture.co.kr';
    }

    /**
     * API 서버 도메인
     * @default 'api.neture.co.kr'
     */
    static get apiDomain(): string {
        return process.env.API_DOMAIN || `api.${this.domain}`;
    }

    /**
     * 관리자 대시보드 도메인
     * @default 'admin.neture.co.kr'
     */
    static get adminDomain(): string {
        return process.env.ADMIN_DOMAIN || `admin.${this.domain}`;
    }

    /**
     * 쇼핑몰 도메인
     * @default 'shop.neture.co.kr'
     */
    static get shopDomain(): string {
        return process.env.SHOP_DOMAIN || `shop.${this.domain}`;
    }

    /**
     * 메인 사이트 도메인 (www 포함)
     * @default 'www.neture.co.kr'
     */
    static get mainSiteDomain(): string {
        return process.env.MAIN_SITE_DOMAIN || `www.${this.domain}`;
    }

    // ========================================
    // Platform.Email
    // ========================================

    /**
     * 이메일 발신자 이름
     * @default 'O4O Platform'
     */
    static get emailFromName(): string {
        return process.env.EMAIL_FROM_NAME || 'O4O Platform';
    }

    /**
     * 이메일 발신자 주소
     * @default 'noreply@{domain}' 또는 SMTP_USER
     */
    static get emailFromAddress(): string {
        return (
            process.env.EMAIL_FROM_ADDRESS ||
            process.env.SMTP_USER ||
            `noreply@${this.domain}`
        );
    }

    // ========================================
    // Platform.AI
    // ========================================

    /**
     * AI Provider 기본값
     * @default 'local'
     */
    static get aiProvider(): string {
        return process.env.AI_PROVIDER || 'local';
    }

    /**
     * AI Model 기본값
     * @default 'gpt-4'
     */
    static get aiModel(): string {
        return process.env.AI_MODEL || 'gpt-4';
    }

    // ========================================
    // Utility Methods
    // ========================================

    /**
     * 전체 URL 생성 (https 포함)
     * @param subdomain - 서브도메인 (예: 'api', 'admin')
     * @param path - 경로 (예: '/api/v1')
     */
    static getFullUrl(subdomain?: string, path: string = ''): string {
        const domain = subdomain ? `${subdomain}.${this.domain}` : this.domain;
        return `https://${domain}${path}`;
    }

    /**
     * API Base URL 생성
     * @param path - API 경로 (기본: '/api/v1')
     */
    static getApiUrl(path: string = '/api/v1'): string {
        return this.getFullUrl('api', path);
    }
}

/**
 * 브라우저 환경에서 사용 가능한 Settings (process.env 없음)
 */
export class BrowserPlatformSettings {
    /**
     * 브라우저에서 현재 도메인 기반으로 플랫폼 도메인 추출
     */
    static get domain(): string {
        if (typeof window === 'undefined') {
            return 'neture.co.kr';
        }

        const hostname = window.location.hostname;

        // localhost 또는 개발 환경
        if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
            return 'neture.co.kr'; // 기본값
        }

        // neture.co.kr 도메인 추출
        const match = hostname.match(/([^.]+\.co\.kr)$/);
        return match ? match[1] : 'neture.co.kr';
    }

    /**
     * API 도메인
     */
    static get apiDomain(): string {
        return `api.${this.domain}`;
    }

    /**
     * API Base URL
     */
    static getApiUrl(path: string = '/api/v1'): string {
        return `https://${this.apiDomain}${path}`;
    }
}
