/**
 * 크라우드펀딩 스케줄 작업
 */

import { CronJob } from 'cron';
import { crowdfundingService } from '../services/CrowdfundingService';
import logger from '../utils/simpleLogger';

/**
 * 프로젝트 상태 업데이트 (매일 0시)
 */
export const updateProjectStatusJob = new CronJob(
  '0 0 * * *', // 매일 자정
  async () => {
    try {
      logger.info('Starting crowdfunding project status update...');
      await crowdfundingService.updateProjectStatuses();
      logger.info('Crowdfunding project status update completed');
    } catch (error) {
      logger.error('Failed to update project statuses:', error);
    }
  },
  null,
  false, // 자동 시작 안함
  'Asia/Seoul'
);

/**
 * 스케줄 작업 시작
 */
export function startCrowdfundingSchedules(): void {
  updateProjectStatusJob.start();
  logger.info('Crowdfunding schedule jobs started');
}

/**
 * 스케줄 작업 중지
 */
export function stopCrowdfundingSchedules(): void {
  updateProjectStatusJob.stop();
  logger.info('Crowdfunding schedule jobs stopped');
}