/**
 * InvoiceAutoGenerator
 *
 * 연회비 자동 청구 생성 서비스
 * - 정책 기반 자동 청구서 생성
 * - 전체 활성 회원 대상 일괄 청구
 * - 감면 대상자 자동 적용
 *
 * Phase R1.1: MembershipReadPort 사용으로 의존성 전환
 */

import { DataSource, Repository } from 'typeorm';
import { FeePolicy } from '../entities/FeePolicy.js';
import { FeeInvoice, AmountBreakdown } from '../entities/FeeInvoice.js';
import { FeeCalculationService, MemberFeeContext, FeeCalculationResult } from './FeeCalculationService.js';
import { FeeLogService } from './FeeLogService.js';
import type { MembershipReadPort, MemberFeeInfo } from '@o4o/membership-yaksa';

export interface AutoGenerateOptions {
  year: number;
  policyId?: string;
  dryRun?: boolean;
  organizationId?: string; // 특정 조직만 대상
}

export interface AutoGenerateResult {
  success: boolean;
  totalMembers: number;
  generated: number;
  skipped: number;
  errors: number;
  details: {
    memberId: string;
    memberName?: string;
    status: 'generated' | 'skipped' | 'error';
    reason?: string;
    invoiceId?: string;
    amount?: number;
  }[];
}

export class InvoiceAutoGenerator {
  private policyRepo: Repository<FeePolicy>;
  private invoiceRepo: Repository<FeeInvoice>;
  private calculationService: FeeCalculationService;
  private logService: FeeLogService;
  private membershipPort: MembershipReadPort | null = null;

  constructor(private dataSource: DataSource) {
    this.policyRepo = dataSource.getRepository(FeePolicy);
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.calculationService = new FeeCalculationService(dataSource);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * Phase R1.1: MembershipReadPort 주입
   */
  setMembershipPort(port: MembershipReadPort): void {
    this.membershipPort = port;
  }

  /**
   * 자동 청구서 생성 실행
   */
  async generateInvoices(
    options: AutoGenerateOptions,
    performedBy?: string
  ): Promise<AutoGenerateResult> {
    const { year, policyId, dryRun = false, organizationId } = options;

    // 1. 정책 조회
    let policy: FeePolicy | null;
    if (policyId) {
      policy = await this.policyRepo.findOne({ where: { id: policyId } });
    } else {
      policy = await this.policyRepo.findOne({
        where: { year, isActive: true },
      });
    }

    if (!policy) {
      return {
        success: false,
        totalMembers: 0,
        generated: 0,
        skipped: 0,
        errors: 1,
        details: [
          {
            memberId: '',
            status: 'error',
            reason: `${year}년 활성 정책을 찾을 수 없습니다.`,
          },
        ],
      };
    }

    // 2. 활성 회원 목록 조회
    const members = await this.getActiveMembers(year, organizationId);

    const result: AutoGenerateResult = {
      success: true,
      totalMembers: members.length,
      generated: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    // 3. 각 회원에 대해 청구서 생성
    for (const member of members) {
      try {
        // 이미 청구서가 있는지 확인
        const existingInvoice = await this.invoiceRepo.findOne({
          where: {
            memberId: member.id,
            year,
          },
        });

        if (existingInvoice) {
          result.skipped++;
          result.details.push({
            memberId: member.id,
            memberName: member.name,
            status: 'skipped',
            reason: '이미 청구서가 존재합니다.',
          });
          continue;
        }

        // 회비 계산
        const context: MemberFeeContext = {
          memberId: member.id,
          memberName: member.name,
          pharmacistType: member.pharmacistType,
          officialRole: member.officialRole,
          organizationId: member.organizationId,
          birthdate: member.birthdate,
          requiresAnnualFee: member.requiresAnnualFee,
          yaksaJoinDate: member.yaksaJoinDate,
          isActive: member.isActive,
          isVerified: member.isVerified,
        };

        const calculation = await this.calculationService.calculateFee(context, year);

        // 회비가 면제된 경우
        if (calculation.isExempt) {
          result.skipped++;
          result.details.push({
            memberId: member.id,
            memberName: member.name,
            status: 'skipped',
            reason: `감면 적용: ${calculation.exemptReason || '전액 면제'}`,
          });
          continue;
        }

        // 회비 납부 대상이 아닌 경우
        if (!member.requiresAnnualFee) {
          result.skipped++;
          result.details.push({
            memberId: member.id,
            memberName: member.name,
            status: 'skipped',
            reason: '회비 납부 대상이 아닙니다.',
          });
          continue;
        }

        // dryRun이면 실제 저장하지 않음
        if (dryRun) {
          result.generated++;
          result.details.push({
            memberId: member.id,
            memberName: member.name,
            status: 'generated',
            amount: calculation.breakdown.finalAmount,
          });
          continue;
        }

        // 청구서 생성
        const invoice = this.invoiceRepo.create({
          memberId: member.id,
          organizationId: member.organizationId,
          policyId: policy.id,
          year,
          amount: calculation.breakdown.finalAmount,
          amountBreakdown: calculation.breakdown,
          status: 'pending',
          dueDate: this.calculateDueDate(policy, year),
        });

        await this.invoiceRepo.save(invoice);

        // 로그 기록
        await this.logService.log({
          action: 'invoice_created',
          entityType: 'invoice',
          entityId: invoice.id,
          memberId: member.id,
          year,
          data: {
            autoGenerated: true,
            policyId: policy.id,
            amount: calculation.breakdown.finalAmount,
          },
          actorId: performedBy,
          actorType: performedBy ? 'admin' : 'batch',
        });

        result.generated++;
        result.details.push({
          memberId: member.id,
          memberName: member.name,
          status: 'generated',
          invoiceId: invoice.id,
          amount: calculation.breakdown.finalAmount,
        });
      } catch (error) {
        result.errors++;
        result.details.push({
          memberId: member.id,
          memberName: member.name,
          status: 'error',
          reason: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    // 생성 완료 로그
    if (!dryRun && result.generated > 0) {
      await this.logService.log({
        action: 'batch_invoice_generated',
        entityType: 'invoice',
        entityId: `batch-${year}-${Date.now()}`,
        year,
        data: {
          policyId: policy.id,
          totalMembers: result.totalMembers,
          generated: result.generated,
          skipped: result.skipped,
          errors: result.errors,
        },
        actorId: performedBy,
        actorType: performedBy ? 'admin' : 'batch',
      });
    }

    return result;
  }

  /**
   * 활성 회원 목록 조회
   * Phase R1.1: MembershipReadPort를 통한 접근
   */
  private async getActiveMembers(
    year: number,
    organizationId?: string
  ): Promise<MemberFeeInfo[]> {
    // Phase R1.1: MembershipReadPort 사용
    if (this.membershipPort) {
      return this.membershipPort.getActiveMembersForFee({
        organizationId,
      });
    }

    // Fallback: 기존 방식 (deprecated)
    console.warn('[InvoiceAutoGenerator] MembershipReadPort not set. Using legacy repository access.');
    const memberRepo = this.dataSource.getRepository('YaksaMember');

    const queryBuilder = memberRepo
      .createQueryBuilder('member')
      .where('member.isActive = :isActive', { isActive: true })
      .andWhere('member.isVerified = :isVerified', { isVerified: true });

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', {
        organizationId,
      });
    }

    const members = await queryBuilder.getMany();

    return members.map((m: any) => ({
      id: m.id,
      name: m.name,
      organizationId: m.organizationId,
      pharmacistType: m.pharmacistType,
      officialRole: m.officialRole,
      birthdate: m.birthdate,
      requiresAnnualFee: m.requiresAnnualFee !== false,
      yaksaJoinDate: m.yaksaJoinDate || m.createdAt,
      isActive: m.isActive !== false,
      isVerified: m.isVerified !== false,
    }));
  }

  /**
   * 납부 기한 계산
   */
  private calculateDueDate(policy: FeePolicy, year: number): string {
    const dueDate = policy.getDueDateForYear();
    if (dueDate) {
      return dueDate.toISOString().split('T')[0];
    }
    // 기본값: 해당 연도 3월 31일
    return `${year}-03-31`;
  }

  /**
   * 특정 회원에 대한 청구서 재생성
   * (신상신고 변경 시 사용)
   * Phase R1.1: MembershipReadPort 사용
   */
  async regenerateInvoice(
    memberId: string,
    year: number,
    performedBy?: string
  ): Promise<{
    success: boolean;
    invoice?: FeeInvoice;
    error?: string;
  }> {
    // 기존 청구서 조회
    const existingInvoice = await this.invoiceRepo.findOne({
      where: { memberId, year },
    });

    // 납부 완료된 청구서는 재생성 불가
    if (existingInvoice && existingInvoice.status === 'paid') {
      return {
        success: false,
        error: '이미 납부 완료된 청구서는 재생성할 수 없습니다.',
      };
    }

    // Phase R1.1: MembershipReadPort를 통한 회원 정보 조회
    let member: MemberFeeInfo | null = null;
    if (this.membershipPort) {
      member = await this.membershipPort.getMemberForFeeCalculation(memberId);
    } else {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[InvoiceAutoGenerator] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMember = await memberRepo.findOne({ where: { id: memberId } });
      if (rawMember) {
        const m = rawMember as any;
        member = {
          id: m.id,
          name: m.name,
          organizationId: m.organizationId,
          pharmacistType: m.pharmacistType,
          officialRole: m.officialRole,
          birthdate: m.birthdate,
          requiresAnnualFee: m.requiresAnnualFee !== false,
          yaksaJoinDate: m.yaksaJoinDate || m.createdAt,
          isActive: m.isActive !== false,
          isVerified: m.isVerified !== false,
        };
      }
    }

    if (!member) {
      return {
        success: false,
        error: '회원을 찾을 수 없습니다.',
      };
    }

    // 정책 조회
    const policy = await this.policyRepo.findOne({
      where: { year, isActive: true },
    });

    if (!policy) {
      return {
        success: false,
        error: `${year}년 활성 정책을 찾을 수 없습니다.`,
      };
    }

    // 회비 재계산
    const context: MemberFeeContext = {
      memberId: member.id,
      memberName: member.name,
      pharmacistType: member.pharmacistType,
      officialRole: member.officialRole,
      organizationId: member.organizationId,
      birthdate: member.birthdate,
      requiresAnnualFee: member.requiresAnnualFee,
      yaksaJoinDate: member.yaksaJoinDate,
      isActive: member.isActive,
      isVerified: member.isVerified,
    };

    const calculation = await this.calculationService.calculateFee(context, year);

    if (existingInvoice) {
      // 기존 청구서 업데이트
      const oldAmount = existingInvoice.amount;
      existingInvoice.amount = calculation.breakdown.finalAmount;
      existingInvoice.amountBreakdown = calculation.breakdown;

      if (calculation.isExempt) {
        existingInvoice.status = 'exempted';
        existingInvoice.exemptionReason = calculation.exemptReason;
      }

      await this.invoiceRepo.save(existingInvoice);

      await this.logService.log({
        action: 'invoice_updated',
        entityType: 'invoice',
        entityId: existingInvoice.id,
        memberId,
        year,
        data: {
          regenerated: true,
          oldAmount,
          newAmount: calculation.breakdown.finalAmount,
          reason: 'member_info_changed',
        },
        actorId: performedBy,
        actorType: performedBy ? 'admin' : 'system',
      });

      return {
        success: true,
        invoice: existingInvoice,
      };
    }

    // 새 청구서 생성
    const invoice = this.invoiceRepo.create({
      memberId,
      organizationId: member.organizationId,
      policyId: policy.id,
      year,
      amount: calculation.breakdown.finalAmount,
      amountBreakdown: calculation.breakdown,
      status: calculation.isExempt ? 'exempted' : 'pending',
      exemptionReason: calculation.exemptReason,
      dueDate: this.calculateDueDate(policy, year),
    });

    await this.invoiceRepo.save(invoice);

    await this.logService.log({
      action: 'invoice_created',
      entityType: 'invoice',
      entityId: invoice.id,
      memberId,
      year,
      data: {
        amount: calculation.breakdown.finalAmount,
      },
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'system',
    });

    return {
      success: true,
      invoice,
    };
  }
}

export function createInvoiceAutoGenerator(dataSource: DataSource): InvoiceAutoGenerator {
  return new InvoiceAutoGenerator(dataSource);
}
