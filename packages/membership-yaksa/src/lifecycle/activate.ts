import { DataSource } from 'typeorm';
import { jobRegistry, type JobDefinition } from '@o4o/yaksa-scheduler';

/**
 * Membership-Yaksa Activate Hook
 *
 * 앱 활성화 시 실행
 * Phase R1.1: JobRegistry에 Job 정의 등록
 */

/**
 * Phase R1.1: Membership-Yaksa Job 정의
 *
 * 핸들러는 Phase R2에서 이동 예정
 * 현재는 yaksa-scheduler의 기존 핸들러가 fallback으로 동작
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
    handler: async (job, context) => {
      // Phase R2에서 실제 핸들러 구현 이동 예정
      console.log('[membership-yaksa] verification_expiry_check handler called');
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'Placeholder - using fallback handler',
      };
    },
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
    handler: async (job, context) => {
      console.log('[membership-yaksa] license_renewal_reminder handler called');
      return {
        success: true,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        summary: 'Placeholder - using fallback handler',
      };
    },
  },
];

export async function activate(dataSource: DataSource): Promise<void> {
  console.log('[Membership-Yaksa] Activating...');

  // Phase R1.1: JobRegistry에 Job 정의 등록
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
