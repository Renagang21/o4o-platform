/**
 * PaymentEventService
 *
 * WO-O4O-PAYMENT-CORE-V0.1
 *
 * 결제 이벤트 발행 및 저장 서비스
 *
 * 책임:
 * - 결제 이벤트 발행 (EventEmitter2)
 * - 이벤트 로그 DB 저장
 * - 이벤트 조회
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentEventLog } from '../entities/PaymentEventLog.entity.js';
import {
  PaymentEvent,
  PaymentEventType,
  PaymentInitiatedEvent,
  PaymentConfirmedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '../types/PaymentEvents.js';

/**
 * 이벤트 조회 옵션
 */
export interface EventQueryOptions {
  paymentId?: string;
  orderId?: string;
  eventTypes?: PaymentEventType[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PaymentEventService {
  constructor(
    @InjectRepository(PaymentEventLog)
    private readonly eventLogRepository: Repository<PaymentEventLog>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 이벤트 발행 및 저장
   */
  async emit(event: PaymentEvent): Promise<void> {
    const eventLog = this.eventLogRepository.create({
      eventType: event.eventType,
      paymentId: event.paymentId,
      transactionId: event.transactionId,
      orderId: event.orderId,
      payload: event as unknown as Record<string, any>,
      eventTimestamp: event.timestamp,
      source: 'payment-core',
      version: 'v0.1',
      status: 'pending',
    });

    try {
      // 이벤트 발행
      this.eventEmitter.emit(event.eventType, event);

      // 저장
      eventLog.status = 'published';
      await this.eventLogRepository.save(eventLog);
    } catch (error) {
      // 발행 실패 시 에러 기록
      eventLog.status = 'failed';
      eventLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.eventLogRepository.save(eventLog);
      throw error;
    }
  }

  /**
   * 결제 시작 이벤트 발행
   */
  async emitInitiated(params: {
    paymentId: string;
    transactionId: string;
    orderId: string;
    requestedAmount: number;
    currency: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: PaymentInitiatedEvent = {
      eventType: PaymentEventType.PAYMENT_INITIATED,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      orderId: params.orderId,
      requestedAmount: params.requestedAmount,
      currency: params.currency,
      timestamp: new Date(),
      metadata: params.metadata,
    };

    await this.emit(event);
  }

  /**
   * 결제 확인 이벤트 발행
   */
  async emitConfirmed(params: {
    paymentId: string;
    transactionId: string;
    orderId: string;
    paymentKey: string;
    paidAmount: number;
    paymentMethod: string;
    approvedAt: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: PaymentConfirmedEvent = {
      eventType: PaymentEventType.PAYMENT_CONFIRMED,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      orderId: params.orderId,
      paymentKey: params.paymentKey,
      paidAmount: params.paidAmount,
      paymentMethod: params.paymentMethod,
      approvedAt: params.approvedAt,
      timestamp: new Date(),
      metadata: params.metadata,
    };

    await this.emit(event);
  }

  /**
   * 결제 완료 이벤트 발행
   *
   * ⭐ 핵심 이벤트: Extension App 트리거
   */
  async emitCompleted(params: {
    paymentId: string;
    transactionId: string;
    orderId: string;
    paymentKey: string;
    paidAmount: number;
    paymentMethod: string;
    approvedAt: Date;
    card?: {
      company: string;
      number: string;
      installmentMonths: number;
    };
    receiptUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: PaymentCompletedEvent = {
      eventType: PaymentEventType.PAYMENT_COMPLETED,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      orderId: params.orderId,
      paymentKey: params.paymentKey,
      paidAmount: params.paidAmount,
      paymentMethod: params.paymentMethod,
      approvedAt: params.approvedAt,
      card: params.card,
      receiptUrl: params.receiptUrl,
      timestamp: new Date(),
      metadata: params.metadata,
    };

    await this.emit(event);
  }

  /**
   * 결제 실패 이벤트 발행
   */
  async emitFailed(params: {
    paymentId: string;
    transactionId: string;
    orderId: string;
    errorCode?: string;
    errorMessage: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const event: PaymentFailedEvent = {
      eventType: PaymentEventType.PAYMENT_FAILED,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      orderId: params.orderId,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      failedAt: new Date(),
      timestamp: new Date(),
      metadata: params.metadata,
    };

    await this.emit(event);
  }

  /**
   * 이벤트 로그 조회
   */
  async findEvents(options: EventQueryOptions = {}): Promise<PaymentEventLog[]> {
    const where: FindOptionsWhere<PaymentEventLog> = {};

    if (options.paymentId) {
      where.paymentId = options.paymentId;
    }

    if (options.orderId) {
      where.orderId = options.orderId;
    }

    if (options.fromDate) {
      where.eventTimestamp = MoreThanOrEqual(options.fromDate);
    }

    // eventTypes 필터는 별도 처리 필요 (IN 쿼리)
    const queryBuilder = this.eventLogRepository
      .createQueryBuilder('event')
      .orderBy('event.eventTimestamp', 'DESC');

    if (options.paymentId) {
      queryBuilder.andWhere('event.paymentId = :paymentId', { paymentId: options.paymentId });
    }

    if (options.orderId) {
      queryBuilder.andWhere('event.orderId = :orderId', { orderId: options.orderId });
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      queryBuilder.andWhere('event.eventType IN (:...eventTypes)', {
        eventTypes: options.eventTypes,
      });
    }

    if (options.fromDate) {
      queryBuilder.andWhere('event.eventTimestamp >= :fromDate', { fromDate: options.fromDate });
    }

    if (options.toDate) {
      queryBuilder.andWhere('event.eventTimestamp <= :toDate', { toDate: options.toDate });
    }

    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    return await queryBuilder.getMany();
  }

  /**
   * 결제 ID로 이벤트 조회
   */
  async findByPaymentId(paymentId: string): Promise<PaymentEventLog[]> {
    return this.findEvents({ paymentId });
  }

  /**
   * 주문 ID로 이벤트 조회
   */
  async findByOrderId(orderId: string): Promise<PaymentEventLog[]> {
    return this.findEvents({ orderId });
  }
}
