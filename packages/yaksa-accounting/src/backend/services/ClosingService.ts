/**
 * ClosingService
 *
 * 월별 마감 관리 서비스
 *
 * === 규칙 ===
 * - closeMonth(): 월 마감 처리
 * - reopenMonth(): ❌ 재오픈 불가 (함수 없음)
 */

import { Repository, DataSource } from 'typeorm';
import { MonthlyClose } from '../entities';

export interface CloseMonthResult {
  yearMonth: string;
  isClosed: boolean;
  closedAt: string;
  closedBy: string;
}

export class ClosingService {
  private closeRepository: Repository<MonthlyClose>;

  constructor(dataSource: DataSource) {
    this.closeRepository = dataSource.getRepository(MonthlyClose);
  }

  /**
   * 월 마감
   *
   * 한 번 마감되면 재오픈 불가
   */
  async closeMonth(
    organizationId: string,
    yearMonth: string,
    userId: string
  ): Promise<CloseMonthResult> {
    // 유효성 검사
    if (!this.isValidYearMonth(yearMonth)) {
      throw new Error('올바른 형식이 아닙니다. (YYYY-MM)');
    }

    // 미래 월 마감 방지
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (yearMonth > currentYearMonth) {
      throw new Error('미래 월은 마감할 수 없습니다.');
    }

    // 기존 마감 레코드 확인
    let close = await this.closeRepository.findOne({
      where: { organizationId, yearMonth },
    });

    if (close?.isClosed) {
      throw new Error(`${yearMonth} 월은 이미 마감되었습니다.`);
    }

    const closedAt = new Date();

    if (close) {
      // 기존 레코드 업데이트
      close.isClosed = true;
      close.closedAt = closedAt;
      close.closedBy = userId;
    } else {
      // 새 레코드 생성
      close = this.closeRepository.create({
        organizationId,
        yearMonth,
        isClosed: true,
        closedAt,
        closedBy: userId,
      });
    }

    await this.closeRepository.save(close);

    return {
      yearMonth,
      isClosed: true,
      closedAt: closedAt.toISOString(),
      closedBy: userId,
    };
  }

  /**
   * 마감 상태 조회
   */
  async getCloseStatus(
    organizationId: string,
    yearMonth: string
  ): Promise<{ isClosed: boolean; closedAt?: string; closedBy?: string }> {
    const close = await this.closeRepository.findOne({
      where: { organizationId, yearMonth },
    });

    return {
      isClosed: close?.isClosed ?? false,
      closedAt: close?.closedAt?.toISOString(),
      closedBy: close?.closedBy,
    };
  }

  /**
   * 조직의 모든 마감 상태 조회
   */
  async listCloseStatuses(
    organizationId: string,
    year: number
  ): Promise<Array<{ yearMonth: string; isClosed: boolean; closedAt?: string }>> {
    const closes = await this.closeRepository.find({
      where: { organizationId },
      order: { yearMonth: 'ASC' },
    });

    // 해당 연도만 필터
    const filtered = closes.filter((c) => c.yearMonth.startsWith(String(year)));

    return filtered.map((c) => ({
      yearMonth: c.yearMonth,
      isClosed: c.isClosed,
      closedAt: c.closedAt?.toISOString(),
    }));
  }

  /**
   * YYYY-MM 형식 검증
   */
  private isValidYearMonth(yearMonth: string): boolean {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
    return regex.test(yearMonth);
  }

  /**
   * 재오픈은 의도적으로 제공하지 않음
   *
   * reopenMonth() 함수가 없는 것은 의도적입니다.
   * 마감된 월은 수정할 수 없습니다.
   */
}
