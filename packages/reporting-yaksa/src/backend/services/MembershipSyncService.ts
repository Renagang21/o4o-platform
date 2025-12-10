import { DataSource } from 'typeorm';
import { AnnualReport } from '../entities/AnnualReport.js';
import { ReportFieldTemplate, ReportFieldDefinition } from '../entities/ReportFieldTemplate.js';
import { AnnualReportService, ActorInfo } from './AnnualReportService.js';

/**
 * SyncResult
 */
export interface SyncResult {
  success: boolean;
  reportId: string;
  memberId: string;
  changes: Record<string, { from: any; to: any }>;
  errors?: string[];
}

/**
 * MembershipSyncService
 *
 * 신상신고서 승인 시 Membership-Yaksa 자동 업데이트 서비스
 *
 * 이 서비스는 reporting-yaksa와 membership-yaksa 간의
 * 데이터 동기화를 담당합니다.
 */
export class MembershipSyncService {
  private reportService: AnnualReportService;

  constructor(private dataSource: DataSource) {
    this.reportService = new AnnualReportService(dataSource);
  }

  /**
   * 승인된 신고서의 변경사항을 Membership-Yaksa에 동기화
   *
   * @param reportId 신고서 ID
   * @param actor 동기화 수행자 정보
   * @returns 동기화 결과
   */
  async syncApprovedReport(reportId: string, actor?: ActorInfo): Promise<SyncResult> {
    // 1. 신고서 조회
    const report = await this.reportService.findById(reportId);
    if (!report) {
      throw new Error(`Report "${reportId}" not found`);
    }

    if (report.status !== 'approved') {
      throw new Error(`Report is not approved. Current status: ${report.status}`);
    }

    if (report.syncedToMembership) {
      return {
        success: true,
        reportId,
        memberId: report.memberId,
        changes: report.syncedChanges || {},
      };
    }

    // 2. 동기화할 필드 추출
    const syncFields = this.extractSyncFields(report);
    if (Object.keys(syncFields).length === 0) {
      // 동기화할 필드가 없으면 완료 표시만
      await this.reportService.markSynced(reportId, {}, actor);
      return {
        success: true,
        reportId,
        memberId: report.memberId,
        changes: {},
      };
    }

    // 3. Membership-Yaksa Member 업데이트
    const changes = await this.updateMember(report.memberId, syncFields);

    // 4. 동기화 완료 표시
    await this.reportService.markSynced(reportId, changes, actor);

    return {
      success: true,
      reportId,
      memberId: report.memberId,
      changes,
    };
  }

  /**
   * 동기화 대상 필드 추출
   */
  private extractSyncFields(report: AnnualReport): Record<string, { target: string; value: any }> {
    const syncFields: Record<string, { target: string; value: any }> = {};

    if (!report.template?.fields) {
      return syncFields;
    }

    for (const fieldDef of report.template.fields) {
      if (fieldDef.syncToMembership && fieldDef.syncTarget) {
        const value = report.fields[fieldDef.key];

        // 빈 값은 무시 (변경 없음)
        if (value === undefined || value === null || value === '') {
          continue;
        }

        syncFields[fieldDef.key] = {
          target: fieldDef.syncTarget,
          value,
        };
      }
    }

    return syncFields;
  }

  /**
   * Member 엔티티 업데이트
   *
   * @param memberId 회원 ID
   * @param syncFields 동기화할 필드 목록
   * @returns 변경 사항
   */
  private async updateMember(
    memberId: string,
    syncFields: Record<string, { target: string; value: any }>
  ): Promise<Record<string, { from: any; to: any }>> {
    const changes: Record<string, { from: any; to: any }> = {};

    // Member 엔티티 조회 (membership-yaksa의 Member)
    // 직접 import하지 않고 DataSource를 통해 접근
    const memberRepo = this.dataSource.getRepository('yaksa_members');

    const member = await memberRepo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new Error(`Member "${memberId}" not found`);
    }

    // 필드별 업데이트
    for (const [fieldKey, { target, value }] of Object.entries(syncFields)) {
      const oldValue = this.getNestedValue(member, target);

      // 값이 같으면 스킵
      if (oldValue === value) {
        continue;
      }

      // 변경 기록
      changes[target] = { from: oldValue, to: value };

      // 값 설정
      this.setNestedValue(member, target, value);
    }

    // 변경사항이 있으면 저장
    if (Object.keys(changes).length > 0) {
      await memberRepo.save(member);
    }

    return changes;
  }

  /**
   * 중첩 객체에서 값 가져오기
   * 예: "metadata.workplaceType" → member.metadata.workplaceType
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 중첩 객체에 값 설정
   * 예: "metadata.workplaceType" → member.metadata.workplaceType = value
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === null || current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * 미동기화 승인 신고서 일괄 처리
   */
  async syncAllPending(actor?: ActorInfo): Promise<{
    total: number;
    success: number;
    failed: number;
    results: SyncResult[];
  }> {
    // 승인됐지만 동기화되지 않은 신고서 조회
    const reportRepo = this.dataSource.getRepository(AnnualReport);
    const pendingReports = await reportRepo.find({
      where: {
        status: 'approved',
        syncedToMembership: false,
      },
      relations: ['template'],
    });

    const results: SyncResult[] = [];
    let success = 0;
    let failed = 0;

    for (const report of pendingReports) {
      try {
        const result = await this.syncApprovedReport(report.id, actor);
        results.push(result);
        success++;
      } catch (error: any) {
        results.push({
          success: false,
          reportId: report.id,
          memberId: report.memberId,
          changes: {},
          errors: [error.message],
        });
        failed++;
      }
    }

    return {
      total: pendingReports.length,
      success,
      failed,
      results,
    };
  }

  /**
   * 특정 신고서의 동기화 프리뷰
   *
   * 실제 저장 없이 어떤 변경이 발생할지 미리 확인
   */
  async previewSync(reportId: string): Promise<{
    reportId: string;
    memberId: string;
    pendingChanges: Record<string, { target: string; currentValue: any; newValue: any }>;
  }> {
    const report = await this.reportService.findById(reportId);
    if (!report) {
      throw new Error(`Report "${reportId}" not found`);
    }

    const syncFields = this.extractSyncFields(report);
    const pendingChanges: Record<string, { target: string; currentValue: any; newValue: any }> = {};

    if (Object.keys(syncFields).length === 0) {
      return {
        reportId,
        memberId: report.memberId,
        pendingChanges: {},
      };
    }

    // Member 조회
    const memberRepo = this.dataSource.getRepository('yaksa_members');
    const member = await memberRepo.findOne({ where: { id: report.memberId } });

    if (member) {
      for (const [fieldKey, { target, value }] of Object.entries(syncFields)) {
        const currentValue = this.getNestedValue(member, target);
        if (currentValue !== value) {
          pendingChanges[fieldKey] = {
            target,
            currentValue,
            newValue: value,
          };
        }
      }
    }

    return {
      reportId,
      memberId: report.memberId,
      pendingChanges,
    };
  }
}
