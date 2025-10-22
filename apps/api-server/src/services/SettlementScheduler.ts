import { LessThanOrEqual, Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { PaymentSettlement, SettlementStatus } from '../entities/PaymentSettlement';
import logger from '../utils/logger';
import * as cron from 'node-cron';

/**
 * 정산 스케줄러
 * 매일 자정에 정산 예정일이 도래한 정산을 처리합니다.
 */
export class SettlementScheduler {
  private settlementRepository: Repository<PaymentSettlement>;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor() {
    this.settlementRepository = AppDataSource.getRepository(PaymentSettlement);
  }

  /**
   * 스케줄러 시작
   * @param cronExpression cron 표현식 (기본값: 매일 자정)
   */
  start(cronExpression: string = '0 0 * * *'): void {
    if (this.cronJob) {
      logger.warn('Settlement scheduler is already running');
      return;
    }

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.processSettlements();
    });

    logger.info(`Settlement scheduler started with cron: ${cronExpression}`);
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Settlement scheduler stopped');
    }
  }

  /**
   * 정산 처리 (수동 실행 가능)
   */
  async processSettlements(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Settlement processing is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting settlement processing...');

      const now = new Date();

      // 정산 예정일이 도래한 scheduled 상태의 정산 조회
      const dueSettlements = await this.settlementRepository.find({
        where: {
          status: SettlementStatus.SCHEDULED,
          scheduledAt: LessThanOrEqual(now)
        },
        relations: ['payment'],
        order: {
          scheduledAt: 'ASC'
        }
      });

      if (dueSettlements.length === 0) {
        logger.info('No settlements due for processing');
        return;
      }

      logger.info(`Found ${dueSettlements.length} settlements to process`);

      let successCount = 0;
      let failureCount = 0;

      // 각 정산 처리
      for (const settlement of dueSettlements) {
        try {
          await this.processSingleSettlement(settlement);
          successCount++;
        } catch (error) {
          logger.error(`Failed to process settlement ${settlement.id}:`, error);
          failureCount++;

          // 정산 실패 처리
          settlement.status = SettlementStatus.FAILED;
          settlement.failureReason = error instanceof Error ? error.message : 'Unknown error';
          settlement.retryCount += 1;
          await this.settlementRepository.save(settlement);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `Settlement processing completed in ${duration}ms. ` +
        `Success: ${successCount}, Failed: ${failureCount}`
      );

    } catch (error) {
      logger.error('Error in settlement processing:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 개별 정산 처리
   */
  private async processSingleSettlement(settlement: PaymentSettlement): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 상태를 processing으로 변경
      settlement.status = SettlementStatus.PROCESSING;
      settlement.processedAt = new Date();
      await queryRunner.manager.save(PaymentSettlement, settlement);

      // 2. 실제 정산 처리
      // TODO: 실제 은행 이체 API 호출 등의 로직 추가
      //       - 공급자/파트너 계좌 정보 조회
      //       - 은행 이체 API 호출
      //       - 이체 결과 확인
      //
      // 현재는 시뮬레이션으로 즉시 완료 처리
      await this.simulateSettlementProcessing(settlement);

      // 3. 완료 처리
      settlement.status = SettlementStatus.COMPLETED;
      settlement.completedAt = new Date();
      await queryRunner.manager.save(PaymentSettlement, settlement);

      await queryRunner.commitTransaction();

      logger.info(
        `Settlement completed: ${settlement.id}, ` +
        `Type: ${settlement.recipientType}, ` +
        `Amount: ${settlement.netAmount}`
      );

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 정산 처리 시뮬레이션
   * TODO: 실제 은행 이체 API로 교체
   */
  private async simulateSettlementProcessing(settlement: PaymentSettlement): Promise<void> {
    // 실제 환경에서는 여기서:
    // 1. 수취인 계좌 정보 조회
    // 2. 은행 이체 API 호출
    // 3. 이체 결과 검증
    // 4. 이체 영수증 저장

    logger.debug(`Simulating settlement for ${settlement.recipientName}: ${settlement.netAmount}`);

    // 시뮬레이션: 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 시뮬레이션: 성공
    return Promise.resolve();
  }

  /**
   * 특정 결제의 정산 재시도
   * @param settlementId 정산 ID
   */
  async retrySettlement(settlementId: string): Promise<void> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
      relations: ['payment']
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    if (settlement.status !== SettlementStatus.FAILED) {
      throw new Error(`Settlement status must be FAILED to retry. Current status: ${settlement.status}`);
    }

    // 상태를 scheduled로 변경하여 다음 배치에서 처리되도록 함
    settlement.status = SettlementStatus.SCHEDULED;
    settlement.failureReason = null;
    await this.settlementRepository.save(settlement);

    logger.info(`Settlement ${settlementId} scheduled for retry`);
  }

  /**
   * 정산 통계 조회
   */
  async getSettlementStats(): Promise<{
    scheduled: number;
    processing: number;
    completed: number;
    failed: number;
    totalAmount: {
      scheduled: number;
      completed: number;
    };
  }> {
    const [scheduled, processing, completed, failed] = await Promise.all([
      this.settlementRepository.count({ where: { status: SettlementStatus.SCHEDULED } }),
      this.settlementRepository.count({ where: { status: SettlementStatus.PROCESSING } }),
      this.settlementRepository.count({ where: { status: SettlementStatus.COMPLETED } }),
      this.settlementRepository.count({ where: { status: SettlementStatus.FAILED } })
    ]);

    // 금액 합계 계산
    const scheduledSettlements = await this.settlementRepository.find({
      where: { status: SettlementStatus.SCHEDULED },
      select: ['netAmount']
    });

    const completedSettlements = await this.settlementRepository.find({
      where: { status: SettlementStatus.COMPLETED },
      select: ['netAmount']
    });

    const scheduledAmount = scheduledSettlements.reduce((sum, s) => sum + Number(s.netAmount), 0);
    const completedAmount = completedSettlements.reduce((sum, s) => sum + Number(s.netAmount), 0);

    return {
      scheduled,
      processing,
      completed,
      failed,
      totalAmount: {
        scheduled: scheduledAmount,
        completed: completedAmount
      }
    };
  }
}

export default new SettlementScheduler();
