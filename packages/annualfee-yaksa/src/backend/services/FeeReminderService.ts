/**
 * FeeReminderService
 *
 * 회비 미납자 알림 서비스
 * - 마감일 기준 리마인드 발송
 * - 1차/2차/최종 통지 스케줄링
 * - 이메일/알림 발송
 *
 * Phase R1: MembershipReadPort 사용으로 의존성 전환
 */

import { DataSource, Repository, In } from 'typeorm';
import { FeeInvoice } from '../entities/FeeInvoice.js';
import { FeeLog } from '../entities/FeeLog.js';
import { FeeLogService } from './FeeLogService.js';
import type {
  MembershipReadPort,
  MemberBasicInfo,
} from '@o4o/membership-yaksa';

export interface ReminderConfig {
  daysBeforeDue: number;
  reminderType: 'first' | 'second' | 'final' | 'overdue';
  subject: string;
  template: string;
}

export interface SendReminderOptions {
  year: number;
  reminderType: 'first' | 'second' | 'final' | 'overdue';
  dryRun?: boolean;
  invoiceIds?: string[]; // 특정 청구서만 대상
}

export interface ReminderResult {
  success: boolean;
  totalTargets: number;
  sent: number;
  failed: number;
  details: {
    invoiceId: string;
    memberId: string;
    memberName?: string;
    email?: string;
    status: 'sent' | 'failed' | 'skipped';
    reason?: string;
  }[];
}

// 기본 리마인더 설정
const DEFAULT_REMINDER_CONFIGS: ReminderConfig[] = [
  {
    daysBeforeDue: 30,
    reminderType: 'first',
    subject: '[약사회] 연회비 납부 안내',
    template: 'fee_reminder_first',
  },
  {
    daysBeforeDue: 7,
    reminderType: 'second',
    subject: '[약사회] 연회비 납부 기한 임박 안내',
    template: 'fee_reminder_second',
  },
  {
    daysBeforeDue: 0,
    reminderType: 'final',
    subject: '[약사회] 연회비 납부 기한 도래 안내',
    template: 'fee_reminder_final',
  },
  {
    daysBeforeDue: -1, // 마감일 이후
    reminderType: 'overdue',
    subject: '[약사회] 연회비 미납 안내',
    template: 'fee_reminder_overdue',
  },
];

export class FeeReminderService {
  private invoiceRepo: Repository<FeeInvoice>;
  private logService: FeeLogService;
  private reminderConfigs: ReminderConfig[];
  private membershipPort: MembershipReadPort | null = null;

  constructor(private dataSource: DataSource) {
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.logService = new FeeLogService(dataSource);
    this.reminderConfigs = DEFAULT_REMINDER_CONFIGS;
  }

  /**
   * Phase R1: MembershipReadPort 주입
   * 서비스 초기화 시 호출하여 membership 데이터 접근 인터페이스 설정
   */
  setMembershipPort(port: MembershipReadPort): void {
    this.membershipPort = port;
  }

  /**
   * 리마인더 발송
   */
  async sendReminders(
    options: SendReminderOptions,
    performedBy?: string
  ): Promise<ReminderResult> {
    const { year, reminderType, dryRun = false, invoiceIds } = options;

    // 대상 청구서 조회
    const targets = await this.getReminderTargets(year, reminderType, invoiceIds);

    const result: ReminderResult = {
      success: true,
      totalTargets: targets.length,
      sent: 0,
      failed: 0,
      details: [],
    };

    if (targets.length === 0) {
      return result;
    }

    const config = this.reminderConfigs.find((c) => c.reminderType === reminderType);
    if (!config) {
      return {
        ...result,
        success: false,
        details: [
          {
            invoiceId: '',
            memberId: '',
            status: 'failed',
            reason: `알 수 없는 리마인더 유형: ${reminderType}`,
          },
        ],
      };
    }

    // 각 대상에게 알림 발송
    for (const target of targets) {
      try {
        // 이미 같은 유형의 알림을 발송했는지 확인
        const alreadySent = await this.checkAlreadySent(target.invoice.id, reminderType);
        if (alreadySent) {
          result.details.push({
            invoiceId: target.invoice.id,
            memberId: target.member.id,
            memberName: target.member.name,
            email: target.member.email,
            status: 'skipped',
            reason: '이미 발송됨',
          });
          continue;
        }

        if (dryRun) {
          result.sent++;
          result.details.push({
            invoiceId: target.invoice.id,
            memberId: target.member.id,
            memberName: target.member.name,
            email: target.member.email,
            status: 'sent',
          });
          continue;
        }

        // 알림 발송 (NotificationService 연동)
        const sendResult = await this.sendNotification({
          memberId: target.member.id,
          email: target.member.email,
          subject: config.subject,
          template: config.template,
          data: {
            memberName: target.member.name,
            year,
            amount: target.invoice.amount,
            dueDate: target.invoice.dueDate,
            invoiceId: target.invoice.id,
          },
        });

        if (sendResult.success) {
          // 발송 기록
          await this.logService.log({
            action: 'reminder_sent',
            entityType: 'invoice',
            entityId: target.invoice.id,
            memberId: target.member.id,
            year,
            data: {
              reminderType,
              email: target.member.email,
              subject: config.subject,
            },
            actorId: performedBy,
            actorType: performedBy ? 'admin' : 'batch',
          });

          result.sent++;
          result.details.push({
            invoiceId: target.invoice.id,
            memberId: target.member.id,
            memberName: target.member.name,
            email: target.member.email,
            status: 'sent',
          });
        } else {
          result.failed++;
          result.details.push({
            invoiceId: target.invoice.id,
            memberId: target.member.id,
            memberName: target.member.name,
            email: target.member.email,
            status: 'failed',
            reason: sendResult.error,
          });
        }
      } catch (error) {
        result.failed++;
        result.details.push({
          invoiceId: target.invoice.id,
          memberId: target.member.id,
          memberName: target.member.name,
          status: 'failed',
          reason: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    // 배치 발송 로그
    if (!dryRun && result.sent > 0) {
      await this.logService.log({
        action: 'reminder_sent',
        entityType: 'invoice',
        entityId: `reminder-batch-${year}-${reminderType}`,
        year,
        data: {
          batchReminder: true,
          reminderType,
          totalTargets: result.totalTargets,
          sent: result.sent,
          failed: result.failed,
        },
        actorId: performedBy,
        actorType: performedBy ? 'admin' : 'batch',
      });
    }

    return result;
  }

  /**
   * 리마인더 대상 조회
   */
  private async getReminderTargets(
    year: number,
    reminderType: string,
    invoiceIds?: string[]
  ): Promise<
    Array<{
      invoice: FeeInvoice;
      member: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
      };
    }>
  > {
    let queryBuilder = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.year = :year', { year })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: ['pending', 'sent', 'overdue'],
      });

    if (invoiceIds && invoiceIds.length > 0) {
      queryBuilder = queryBuilder.andWhere('invoice.id IN (:...invoiceIds)', {
        invoiceIds,
      });
    }

    // 리마인더 유형에 따른 필터링
    const today = new Date();
    const config = this.reminderConfigs.find((c) => c.reminderType === reminderType);

    if (config) {
      if (reminderType === 'overdue') {
        // 마감일이 지난 것
        const todayStr = today.toISOString().split('T')[0];
        queryBuilder = queryBuilder.andWhere('invoice.dueDate < :todayStr', { todayStr });
      } else {
        // 마감일 N일 전
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + config.daysBeforeDue);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        queryBuilder = queryBuilder.andWhere('invoice.dueDate = :targetDateStr', { targetDateStr });
      }
    }

    const invoices = await queryBuilder.getMany();

    // 회원 정보 조회
    const memberIds = invoices.map((inv) => inv.memberId);
    if (memberIds.length === 0) {
      return [];
    }

    // Phase R1: MembershipReadPort를 통해 회원 정보 조회
    let members: MemberBasicInfo[] = [];
    if (this.membershipPort) {
      members = await this.membershipPort.getMembersByIds(memberIds);
    } else {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[FeeReminderService] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMembers = await memberRepo.find({
        where: { id: In(memberIds) },
      });
      members = rawMembers.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        licenseNumber: m.licenseNumber,
      }));
    }

    const memberMap = new Map(members.map((m) => [m.id, m]));

    return invoices
      .map((invoice) => {
        const member = memberMap.get(invoice.memberId);
        if (!member) return null;

        return {
          invoice,
          member: {
            id: member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  /**
   * 이미 발송된 알림인지 확인
   */
  private async checkAlreadySent(
    invoiceId: string,
    reminderType: string
  ): Promise<boolean> {
    const logRepo = this.dataSource.getRepository(FeeLog);

    const existingLogs = await logRepo.find({
      where: {
        entityId: invoiceId,
        action: 'reminder_sent',
      },
    });

    for (const log of existingLogs) {
      const data = log.data as any;
      if (data?.reminderType === reminderType) {
        return true;
      }
    }

    return false;
  }

  /**
   * 알림 발송 (NotificationService 연동)
   */
  private async sendNotification(params: {
    memberId: string;
    email?: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: NotificationService 연동
      // const notificationService = ...;
      // await notificationService.send({...});

      // 이메일 발송 (임시 구현)
      if (params.email) {
        console.log(`[FeeReminder] Sending email to ${params.email}`);
        console.log(`  Subject: ${params.subject}`);
        console.log(`  Template: ${params.template}`);
        console.log(`  Data:`, params.data);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알림 발송 실패',
      };
    }
  }

  /**
   * 테스트 알림 발송
   */
  async sendTestReminder(
    invoiceId: string,
    reminderType: string,
    performedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      return { success: false, error: '청구서를 찾을 수 없습니다.' };
    }

    // Phase R1: MembershipReadPort를 통해 회원 정보 조회
    let member: MemberBasicInfo | null = null;
    if (this.membershipPort) {
      member = await this.membershipPort.getMemberById(invoice.memberId);
    } else {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[FeeReminderService] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMember = await memberRepo.findOne({ where: { id: invoice.memberId } });
      if (rawMember) {
        member = {
          id: (rawMember as any).id,
          userId: (rawMember as any).userId,
          organizationId: (rawMember as any).organizationId,
          name: (rawMember as any).name,
          email: (rawMember as any).email,
          phone: (rawMember as any).phone,
          licenseNumber: (rawMember as any).licenseNumber,
        };
      }
    }

    if (!member) {
      return { success: false, error: '회원을 찾을 수 없습니다.' };
    }

    const config = this.reminderConfigs.find((c) => c.reminderType === reminderType);
    if (!config) {
      return { success: false, error: `알 수 없는 리마인더 유형: ${reminderType}` };
    }

    const result = await this.sendNotification({
      memberId: member.id,
      email: member.email,
      subject: `[테스트] ${config.subject}`,
      template: config.template,
      data: {
        memberName: member.name,
        year: invoice.year,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        invoiceId: invoice.id,
      },
    });

    if (result.success) {
      await this.logService.log({
        action: 'reminder_sent',
        entityType: 'invoice',
        entityId: invoice.id,
        memberId: invoice.memberId,
        year: invoice.year,
        data: {
          testReminder: true,
          reminderType,
          email: member.email,
        },
        actorId: performedBy,
        actorType: performedBy ? 'admin' : 'system',
      });
    }

    return result;
  }

  /**
   * 자동 리마인더 스케줄 체크
   * (CronJob에서 호출)
   */
  async checkAndSendScheduledReminders(performedBy?: string): Promise<void> {
    const currentYear = new Date().getFullYear();

    for (const config of this.reminderConfigs) {
      // 해당 일자에 발송할 대상 확인
      const targets = await this.getReminderTargets(currentYear, config.reminderType);

      if (targets.length > 0) {
        console.log(
          `[FeeReminder] Found ${targets.length} targets for ${config.reminderType} reminder`
        );

        await this.sendReminders(
          {
            year: currentYear,
            reminderType: config.reminderType as any,
          },
          performedBy
        );
      }
    }
  }

  /**
   * 리마인더 설정 업데이트
   */
  updateReminderConfigs(configs: ReminderConfig[]): void {
    this.reminderConfigs = configs;
  }

  /**
   * 현재 리마인더 설정 조회
   */
  getReminderConfigs(): ReminderConfig[] {
    return [...this.reminderConfigs];
  }
}

export function createFeeReminderService(dataSource: DataSource): FeeReminderService {
  return new FeeReminderService(dataSource);
}
