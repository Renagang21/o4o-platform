import { DataSource } from 'typeorm';
import { jobRegistry, type JobDefinition } from '@o4o/yaksa-scheduler';
import {
  verificationExpiryCheckHandler,
  licenseRenewalReminderHandler,
} from '../handlers/index.js';

/**
 * Membership-Yaksa Activate Hook
 *
 * 앱 활성화 시 실행
 * Phase R2: Real handlers implemented
 */

/**
 * Phase R2: Membership-Yaksa Job 정의
 *
 * 실제 Handler 구현이 연결됨 (handlers/job-handlers.ts)
 */
const MEMBERSHIP_JOB_DEFINITIONS: JobDefinition[] = [
  {
    id: 'membership-yaksa:verification_expiry_check',
    name: '자격 검증 만료 체크',
    description: '만료된 자격 검증 상태 업데이트 및 회원 알림',
    targetService: 'membership-yaksa',
    actionType: 'verification_expiry_check',
    defaultCronExpression: '0 0 * * *', // 매일 자정
    timezone: 'Asia/Seoul',
    defaultConfig: {
      warningDaysBefore: 30,
    },
    handler: verificationExpiryCheckHandler,
  },
  {
    id: 'membership-yaksa:license_renewal_reminder',
    name: '면허 갱신 알림',
    description: '면허 갱신 필요 회원에게 알림 발송',
    targetService: 'membership-yaksa',
    actionType: 'license_renewal_reminder',
    defaultCronExpression: '0 9 1 * *', // 매월 1일 오전 9시
    timezone: 'Asia/Seoul',
    defaultConfig: {
      reminderMonthsBefore: 3,
    },
    handler: licenseRenewalReminderHandler,
  },
];

export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Activating...');

  // Phase R2: JobRegistry에 Job 정의 등록 (실제 핸들러 포함)
  let registered = 0;
  for (const definition of MEMBERSHIP_JOB_DEFINITIONS) {
    const result = jobRegistry.registerJobDefinition(definition);
    if (result.success) {
      registered++;
    }
  }
  console.log(`[Membership-Yaksa] Registered ${registered}/${MEMBERSHIP_JOB_DEFINITIONS.length} job definitions`);

  console.log('[Membership-Yaksa] Activated');
}
