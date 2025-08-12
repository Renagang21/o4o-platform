/**
 * 크라우드펀딩 스케줄 작업
 */
import { CronJob } from 'cron';
/**
 * 프로젝트 상태 업데이트 (매일 0시)
 */
export declare const updateProjectStatusJob: CronJob<any, null>;
/**
 * 스케줄 작업 시작
 */
export declare function startCrowdfundingSchedules(): void;
/**
 * 스케줄 작업 중지
 */
export declare function stopCrowdfundingSchedules(): void;
//# sourceMappingURL=crowdfundingSchedule.d.ts.map