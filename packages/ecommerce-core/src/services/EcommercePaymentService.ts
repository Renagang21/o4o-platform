/**
 * EcommercePaymentService
 *
 * 결제 관리 서비스
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EcommercePayment,
  PaymentTransactionStatus,
  PaymentMethod,
} from '../entities/EcommercePayment.entity.js';
import { EcommerceOrder, PaymentStatus } from '../entities/EcommerceOrder.entity.js';

/**
 * 결제 생성 DTO
 */
export interface CreatePaymentDto {
  orderId: string;
  paymentMethod: PaymentMethod;
  requestedAmount: number;
  currency?: string;
  pgProvider?: string;
  metadata?: Record<string, any>;
}

/**
 * 결제 완료 DTO
 */
export interface CompletePaymentDto {
  externalPaymentId?: string;
  paidAmount: number;
  cardCompany?: string;
  cardNumber?: string;
  installmentMonths?: number;
  metadata?: Record<string, any>;
}

/**
 * 환불 DTO
 */
export interface RefundPaymentDto {
  refundAmount: number;
  refundReason?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EcommercePaymentService {
  constructor(
    @InjectRepository(EcommercePayment)
    private readonly paymentRepository: Repository<EcommercePayment>,
    @InjectRepository(EcommerceOrder)
    private readonly orderRepository: Repository<EcommerceOrder>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 트랜잭션 ID 생성
   */
  private generateTransactionId(): string {
    const now = new Date();
    const timestamp = now.getTime();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY-${timestamp}-${random}`;
  }

  /**
   * 결제 요청 생성
   */
  async createPayment(dto: CreatePaymentDto): Promise<EcommercePayment> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      transactionId: this.generateTransactionId(),
      paymentMethod: dto.paymentMethod,
      status: PaymentTransactionStatus.PENDING,
      requestedAmount: dto.requestedAmount,
      currency: dto.currency || 'KRW',
      pgProvider: dto.pgProvider,
      requestedAt: new Date(),
      metadata: dto.metadata,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    this.eventEmitter.emit('payment.pending', {
      paymentId: savedPayment.id,
      transactionId: savedPayment.transactionId,
      orderId: savedPayment.orderId,
      requestedAmount: savedPayment.requestedAmount,
    });

    return savedPayment;
  }

  /**
   * 결제 완료 처리
   */
  async completePayment(
    paymentId: string,
    dto: CompletePaymentDto
  ): Promise<EcommercePayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = PaymentTransactionStatus.COMPLETED;
    payment.externalPaymentId = dto.externalPaymentId;
    payment.paidAmount = dto.paidAmount;
    payment.paidAt = new Date();

    if (dto.cardCompany) payment.cardCompany = dto.cardCompany;
    if (dto.cardNumber) payment.cardNumber = dto.cardNumber;
    if (dto.installmentMonths) payment.installmentMonths = dto.installmentMonths;
    if (dto.metadata) {
      payment.metadata = { ...payment.metadata, ...dto.metadata };
    }

    const savedPayment = await this.paymentRepository.save(payment);

    // 주문 결제 상태 업데이트
    const order = await this.orderRepository.findOne({
      where: { id: payment.orderId },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.PAID;
      order.paymentMethod = payment.paymentMethod;
      order.paidAt = savedPayment.paidAt;
      await this.orderRepository.save(order);
    }

    this.eventEmitter.emit('payment.completed', {
      paymentId: savedPayment.id,
      transactionId: savedPayment.transactionId,
      orderId: savedPayment.orderId,
      paidAmount: savedPayment.paidAmount,
      paidAt: savedPayment.paidAt,
    });

    return savedPayment;
  }

  /**
   * 결제 실패 처리
   */
  async failPayment(paymentId: string, reason: string): Promise<EcommercePayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = PaymentTransactionStatus.FAILED;
    payment.failureReason = reason;
    payment.failedAt = new Date();

    const savedPayment = await this.paymentRepository.save(payment);

    // 주문 결제 상태 업데이트
    const order = await this.orderRepository.findOne({
      where: { id: payment.orderId },
    });

    if (order) {
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);
    }

    this.eventEmitter.emit('payment.failed', {
      paymentId: savedPayment.id,
      transactionId: savedPayment.transactionId,
      orderId: savedPayment.orderId,
      reason,
      failedAt: savedPayment.failedAt,
    });

    return savedPayment;
  }

  /**
   * 환불 처리
   */
  async refundPayment(paymentId: string, dto: RefundPaymentDto): Promise<EcommercePayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentTransactionStatus.COMPLETED) {
      throw new Error('Cannot refund uncompleted payment');
    }

    const isPartialRefund = dto.refundAmount < payment.paidAmount;

    payment.status = isPartialRefund
      ? PaymentTransactionStatus.PARTIAL_REFUND
      : PaymentTransactionStatus.REFUNDED;
    payment.refundedAmount = (payment.refundedAmount || 0) + dto.refundAmount;
    payment.refundReason = dto.refundReason;
    payment.refundedAt = new Date();

    if (dto.metadata) {
      payment.metadata = { ...payment.metadata, ...dto.metadata };
    }

    const savedPayment = await this.paymentRepository.save(payment);

    // 주문 결제 상태 업데이트
    const order = await this.orderRepository.findOne({
      where: { id: payment.orderId },
    });

    if (order) {
      order.paymentStatus = isPartialRefund
        ? PaymentStatus.PARTIAL_REFUND
        : PaymentStatus.REFUNDED;
      await this.orderRepository.save(order);
    }

    this.eventEmitter.emit('payment.refunded', {
      paymentId: savedPayment.id,
      transactionId: savedPayment.transactionId,
      orderId: savedPayment.orderId,
      refundAmount: dto.refundAmount,
      isPartialRefund,
      refundedAt: savedPayment.refundedAt,
    });

    return savedPayment;
  }

  /**
   * 결제 조회 (ID)
   */
  async findById(id: string): Promise<EcommercePayment | null> {
    return await this.paymentRepository.findOne({
      where: { id },
      relations: ['order'],
    });
  }

  /**
   * 결제 조회 (트랜잭션 ID)
   */
  async findByTransactionId(transactionId: string): Promise<EcommercePayment | null> {
    return await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['order'],
    });
  }

  /**
   * 주문별 결제 목록 조회
   */
  async findByOrderId(orderId: string): Promise<EcommercePayment[]> {
    return await this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }
}
