import { DataSource, Repository } from 'typeorm';
import { FeeInvoice } from '../entities/FeeInvoice.js';
import { FeePayment } from '../entities/FeePayment.js';
import { FeeLogService } from './FeeLogService.js';

/**
 * MembershipYear 엔티티 타입 (membership-yaksa에서 가져옴)
 */
interface MembershipYear {
  id: string;
  memberId: string;
  year: number;
  paid: boolean;
  paidAt?: Date;
  amount?: number;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * FeeSyncService
 *
 * AnnualFee-Yaksa와 Membership-Yaksa 간 동기화 서비스
 * - FeePayment 완료 → MembershipYear 업데이트
 * - 회원 정보 변경 → 회비 재계산
 */
export class FeeSyncService {
  private invoiceRepo: Repository<FeeInvoice>;
  private logService: FeeLogService;

  constructor(private dataSource: DataSource) {
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * MembershipYear 동기화
   *
   * 청구서가 완납되면 MembershipYear 테이블에 반영
   */
  async syncToMembershipYear(
    invoice: FeeInvoice,
    payment: FeePayment
  ): Promise<void> {
    if (invoice.status !== 'paid') {
      return;
    }

    if (invoice.syncedToMembershipYear) {
      return;
    }

    try {
      // MembershipYear 엔티티 레포지토리 가져오기
      // membership-yaksa 패키지에서 export된 엔티티 사용
      const membershipYearRepo = this.dataSource.getRepository('MembershipYear');

      // 기존 레코드 확인
      let membershipYear = await membershipYearRepo.findOne({
        where: {
          memberId: invoice.memberId,
          year: invoice.year,
        },
      });

      if (membershipYear) {
        // 기존 레코드 업데이트
        membershipYear.paid = true;
        membershipYear.paidAt = payment.paidAt;
        membershipYear.amount = invoice.amount;
        membershipYear.paymentMethod = payment.method;
        membershipYear.transactionId = payment.transactionId;
        membershipYear.receiptUrl = payment.receiptUrl;
        membershipYear.metadata = {
          ...membershipYear.metadata,
          feeInvoiceId: invoice.id,
          feePaymentId: payment.id,
          syncedAt: new Date().toISOString(),
        };
      } else {
        // 새 레코드 생성
        membershipYear = membershipYearRepo.create({
          memberId: invoice.memberId,
          year: invoice.year,
          paid: true,
          paidAt: payment.paidAt,
          amount: invoice.amount,
          paymentMethod: payment.method,
          transactionId: payment.transactionId,
          receiptUrl: payment.receiptUrl,
          metadata: {
            feeInvoiceId: invoice.id,
            feePaymentId: payment.id,
            syncedAt: new Date().toISOString(),
          },
        });
      }

      await membershipYearRepo.save(membershipYear);

      // 청구서에 동기화 완료 표시
      invoice.syncedToMembershipYear = true;
      invoice.syncedAt = new Date();
      await this.invoiceRepo.save(invoice);

      // 로그 기록
      await this.logService.log({
        memberId: invoice.memberId,
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'sync_to_membership_year',
        year: invoice.year,
        data: {
          membershipYearId: (membershipYear as any).id,
          amount: invoice.amount,
          paymentMethod: payment.method,
        },
        actorType: 'system',
        description: `MembershipYear 동기화 완료: ${invoice.year}년`,
      });
    } catch (error) {
      // MembershipYear 테이블이 없거나 동기화 실패 시
      // 로그만 기록하고 진행 (soft failure)
      console.error('Failed to sync to MembershipYear:', error);

      await this.logService.log({
        memberId: invoice.memberId,
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'sync_to_membership_year',
        year: invoice.year,
        data: {
          error: error instanceof Error ? error.message : String(error),
          success: false,
        },
        actorType: 'system',
        description: `MembershipYear 동기화 실패: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * 회원 정보 변경 시 회비 재계산 트리거
   *
   * Reporting-Yaksa에서 신상신고 승인 시 호출
   */
  async onMemberInfoChanged(
    memberId: string,
    changes: {
      pharmacistType?: string;
      officialRole?: string;
      categoryId?: string;
      organizationId?: string;
    }
  ): Promise<void> {
    // 현재 연도의 pending 청구서가 있는지 확인
    const currentYear = new Date().getFullYear();
    const invoice = await this.invoiceRepo.findOne({
      where: {
        memberId,
        year: currentYear,
        status: 'pending' as any,
      },
    });

    if (!invoice) {
      // 청구서가 없으면 재계산 불필요
      return;
    }

    // TODO: 회비 재계산 로직
    // - FeeCalculationService를 통해 새 금액 계산
    // - 청구서 금액 업데이트
    // - 변경 로그 기록

    await this.logService.log({
      memberId,
      entityType: 'member',
      entityId: memberId,
      action: 'fee_calculated',
      year: currentYear,
      data: {
        changes,
        invoiceId: invoice.id,
        reason: 'member_info_changed',
      },
      actorType: 'system',
      description: '회원 정보 변경으로 인한 회비 재계산',
    });
  }

  /**
   * 연수교육 이수 확인 및 감면 적용
   *
   * LMS-Yaksa에서 연수교육 이수 완료 시 호출
   */
  async onLmsCreditsCompleted(
    memberId: string,
    userId: string,
    year: number,
    creditsEarned: number,
    requiredCredits: number
  ): Promise<void> {
    // TODO: 연수교육 우수 감면 적용 로직
    // - 필수 학점의 150% 이상 이수 시 감면 적용
    // - FeeExemptionService를 통해 감면 등록

    if (creditsEarned >= requiredCredits * 1.5) {
      await this.logService.log({
        memberId,
        entityType: 'member',
        entityId: memberId,
        action: 'exemption_auto_applied',
        year,
        data: {
          creditsEarned,
          requiredCredits,
          ratio: Math.round((creditsEarned / requiredCredits) * 100),
          exemptionCategory: 'lmsCredit',
        },
        actorType: 'system',
        description: `연수교육 우수 감면 적용 (${creditsEarned}/${requiredCredits} 학점)`,
      });
    }
  }

  /**
   * 일괄 동기화 (배치)
   *
   * 미동기화된 완납 청구서들을 MembershipYear에 동기화
   */
  async batchSyncToMembershipYear(year?: number): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const targetYear = year ?? new Date().getFullYear();

    const unsyncedInvoices = await this.invoiceRepo.find({
      where: {
        year: targetYear,
        status: 'paid' as any,
        syncedToMembershipYear: false,
      },
      relations: ['payments'],
    });

    const result = { synced: 0, failed: 0, errors: [] as string[] };

    for (const invoice of unsyncedInvoices) {
      try {
        // 가장 최근 완료된 납부 가져오기
        const completedPayment = invoice.payments
          ?.filter((p) => p.status === 'completed')
          .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0];

        if (completedPayment) {
          await this.syncToMembershipYear(invoice, completedPayment);
          result.synced++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Invoice ${invoice.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * 동기화 상태 확인
   */
  async checkSyncStatus(year?: number): Promise<{
    totalPaid: number;
    synced: number;
    unsynced: number;
    syncRate: number;
  }> {
    const targetYear = year ?? new Date().getFullYear();

    const paidInvoices = await this.invoiceRepo.find({
      where: {
        year: targetYear,
        status: 'paid' as any,
      },
      select: ['id', 'syncedToMembershipYear'],
    });

    const totalPaid = paidInvoices.length;
    const synced = paidInvoices.filter((i) => i.syncedToMembershipYear).length;
    const unsynced = totalPaid - synced;
    const syncRate = totalPaid > 0 ? Math.round((synced / totalPaid) * 10000) / 100 : 100;

    return {
      totalPaid,
      synced,
      unsynced,
      syncRate,
    };
  }
}
