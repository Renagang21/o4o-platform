/**
 * Database Health Checker
 * 데이터베이스 연결 상태와 필수 테이블을 체크합니다.
 */
import { DataSource } from 'typeorm';
export declare class DatabaseChecker {
    private dataSource;
    private requiredTables;
    private optionalTables;
    constructor(dataSource: DataSource);
    /**
     * 데이터베이스 연결 체크
     */
    checkConnection(): Promise<boolean>;
    /**
     * 필수 테이블 체크
     */
    checkRequiredTables(): Promise<{
        success: boolean;
        missing: string[];
    }>;
    /**
     * 선택적 테이블 체크
     */
    checkOptionalTables(): Promise<{
        existing: string[];
        missing: string[];
    }>;
    /**
     * 테이블 존재 여부 체크
     */
    private tableExists;
    /**
     * 마이그레이션 상태 체크
     */
    checkMigrations(): Promise<{
        executed: number;
        pending: string[];
    }>;
    /**
     * 전체 헬스 체크
     */
    performHealthCheck(): Promise<{
        healthy: boolean;
        details: {
            connection: boolean;
            requiredTables: {
                success: boolean;
                missing: string[];
            };
            optionalTables: {
                existing: string[];
                missing: string[];
            };
            migrations: {
                executed: number;
                pending: string[];
            };
        };
    }>;
    /**
     * 테이블 생성 시도 (개발 환경에서만)
     */
    tryCreateMissingTables(): Promise<void>;
}
//# sourceMappingURL=database-checker.d.ts.map