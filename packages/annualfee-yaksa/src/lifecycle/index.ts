/**
 * AnnualFee-Yaksa Extension - Lifecycle Hooks
 *
 * AppStore 표준 준수를 위한 Lifecycle 구현
 * - install: 초기 설정
 * - activate: 서비스 활성화 + JobRegistry 등록
 * - deactivate: 서비스 비활성화 + JobRegistry 해제
 * - uninstall: 정리
 *
 * Phase R1.1: JobRegistry 등록 추가
 * Phase R2: 실제 Handler 구현 연결
 */

import { DataSource } from 'typeorm';
import { jobRegistry, type JobDefinition } from '@o4o/yaksa-scheduler';
import {
  invoiceOverdueCheckHandler,
  invoiceDueDateWarningHandler,
  exemptionExpiryCheckHandler,
  settlementReminderHandler,
} from '../handlers/index.js';

export interface LifecycleContext {
  dataSource: DataSource;
  options?: {
    preserveData?: boolean;
  };
}

/**
 * Phase R2: AnnualFee-Yaksa Job 정의
 *
 * 실제 Handler 구현이 연결됨 (handlers/job-handlers.ts)
 */
const ANNUALFEE_JOB_DEFINITIONS: JobDefinition[] = [
  {
    id: 'annualfee-yaksa:invoice_overdue_check',
    name: '청구서 연체 체크',
    description: '납부 기한이 지난 청구서를 연체 상태로 변경하고 회원에게 알림 발송',
    targetService: 'annualfee-yaksa',
    actionType: 'invoice_overdue_check',
    defaultCronExpression: '0 9 * * *', // 매일 오전 9시
    timezone: 'Asia/Seoul',
    defaultConfig: {
      overdueThresholdDays: 0,
    },
    handler: invoiceOverdueCheckHandler,
  },
  {
    id: 'annualfee-yaksa:invoice_due_date_warning',
    name: '납부 기한 임박 알림',
    description: '납부 기한 D-7 회원에게 알림 발송',
    targetService: 'annualfee-yaksa',
    actionType: 'invoice_due_date_warning',
    defaultCronExpression: '0 10 * * *', // 매일 오전 10시
    timezone: 'Asia/Seoul',
    defaultConfig: {
      warningDaysBefore: 7,
    },
    handler: invoiceDueDateWarningHandler,
  },
  {
    id: 'annualfee-yaksa:exemption_expiry_check',
    name: '감면 만료 체크',
    description: '만료된 감면 처리',
    targetService: 'annualfee-yaksa',
    actionType: 'exemption_expiry_check',
    defaultCronExpression: '0 0 1 * *', // 매월 1일 자정
    timezone: 'Asia/Seoul',
    handler: exemptionExpiryCheckHandler,
  },
  {
    id: 'annualfee-yaksa:settlement_reminder',
    name: '정산 알림',
    description: '관리자에게 정산 대기 항목 알림',
    targetService: 'annualfee-yaksa',
    actionType: 'settlement_reminder',
    defaultCronExpression: '0 9 1 * *', // 매월 1일 오전 9시
    timezone: 'Asia/Seoul',
    handler: settlementReminderHandler,
  },
];

/**
 * Install hook - Extension 최초 설치 시 실행
 */
export async function install(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Installing...');
  // 초기 설정 로직
  console.log('[annualfee-yaksa] Installation complete');
}

/**
 * Activate hook - Extension 활성화 시 실행
 * Phase R1.1: JobRegistry에 Job 정의 등록
 */
export async function activate(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Activating...');

  // Phase R1.1: JobRegistry에 Job 정의 등록
  let registered = 0;
  for (const definition of ANNUALFEE_JOB_DEFINITIONS) {
    const result = jobRegistry.registerJobDefinition(definition);
    if (result.success) {
      registered++;
    }
  }
  console.log(`[annualfee-yaksa] Registered ${registered}/${ANNUALFEE_JOB_DEFINITIONS.length} job definitions`);

  console.log('[annualfee-yaksa] Activation complete');
}

/**
 * Deactivate hook - Extension 비활성화 시 실행
 * Phase R1.1: JobRegistry에서 Job 정의 해제
 */
export async function deactivate(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Deactivating...');

  // Phase R1.1: JobRegistry에서 Job 정의 해제
  const unregistered = jobRegistry.unregisterAllForService('annualfee-yaksa');
  console.log(`[annualfee-yaksa] Unregistered ${unregistered} job definitions`);

  console.log('[annualfee-yaksa] Deactivation complete');
}

/**
 * Uninstall hook - Extension 제거 시 실행
 */
export async function uninstall(context: LifecycleContext): Promise<void> {
  console.log('[annualfee-yaksa] Uninstalling...');

  if (context.options?.preserveData) {
    console.log('[annualfee-yaksa] Data preservation enabled, skipping cleanup');
  } else {
    // 데이터 정리 로직
    console.log('[annualfee-yaksa] Cleanup complete');
  }

  console.log('[annualfee-yaksa] Uninstallation complete');
}

export const lifecycle = {
  install,
  activate,
  deactivate,
  uninstall,
};

export default lifecycle;
