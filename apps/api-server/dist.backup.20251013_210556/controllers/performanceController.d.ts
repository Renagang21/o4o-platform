import { Request, Response } from 'express';
/**
 * 통합 성능 대시보드 데이터 조회
 */
export declare const getPerformanceDashboard: (req: Request, res: Response) => Promise<void>;
/**
 * 성능 최적화 상태 조회
 */
export declare const getOptimizationStatus: (req: Request, res: Response) => Promise<void>;
/**
 * 스케일링 상태 조회
 */
export declare const getScalingStatus: (req: Request, res: Response) => Promise<void>;
/**
 * CDN 최적화 상태 조회
 */
export declare const getCDNStatus: (req: Request, res: Response) => Promise<void>;
/**
 * 데이터베이스 최적화 상태 조회
 */
export declare const getDatabaseStatus: (req: Request, res: Response) => Promise<void>;
/**
 * 수동 성능 최적화 실행
 */
export declare const runOptimization: (req: Request, res: Response) => Promise<void>;
/**
 * 수동 스케일링 실행
 */
export declare const runScaling: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * 성능 리포트 생성
 */
export declare const generateReports: (req: Request, res: Response) => Promise<void>;
/**
 * 성능 설정 업데이트
 */
export declare const updatePerformanceSettings: (req: Request, res: Response) => Promise<void>;
/**
 * 실시간 성능 메트릭 조회
 */
export declare const getRealtimeMetrics: (req: Request, res: Response) => Promise<void>;
/**
 * 성능 알림 조회
 */
export declare const getPerformanceAlerts: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=performanceController.d.ts.map