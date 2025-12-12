/**
 * PharmaDispatchService
 *
 * Phase 10: 의약품 배송/출고 관리 서비스
 *
 * 기능:
 * - 출고 생성/조회/수정
 * - 배송 상태 관리
 * - 온도 관리 배송 추적
 * - 마약류 특별 관리
 *
 * @package @o4o/pharmaceutical-core
 */

import { Repository } from 'typeorm';
import {
  PharmaDispatch,
  PharmaDispatchStatus,
  TemperatureControlType,
} from '../entities/PharmaDispatch.entity.js';
import { PharmaOrderService } from './PharmaOrderService.js';

export interface CreatePharmaDispatchDto {
  orderId: string;
  carrierName?: string;
  trackingNumber?: string;
  temperatureControl?: TemperatureControlType;
  requiresColdChain?: boolean;
  temperatureRange?: {
    min: number;
    max: number;
  };
  isNarcotics?: boolean;
  narcoticsControlNumber?: string;
  estimatedDeliveryAt?: Date;
  driverInfo?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  };
  metadata?: Record<string, any>;
}

export interface UpdatePharmaDispatchDto {
  status?: PharmaDispatchStatus;
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  driverInfo?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  };
  deliveryConfirmation?: {
    receiverName?: string;
    receiverSignature?: string;
    receivedAt?: Date;
    notes?: string;
  };
  failureReason?: string;
  estimatedDeliveryAt?: Date;
  metadata?: Record<string, any>;
}

export interface PharmaDispatchFilter {
  orderId?: string;
  status?: PharmaDispatchStatus;
  carrierName?: string;
  requiresColdChain?: boolean;
  isNarcotics?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class PharmaDispatchService {
  constructor(
    private dispatchRepository: Repository<PharmaDispatch>,
    private orderService?: PharmaOrderService
  ) {}

  /**
   * 출고 번호 생성
   */
  private generateDispatchNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DIS-${dateStr}-${random}`;
  }

  /**
   * 출고 생성
   */
  async create(data: CreatePharmaDispatchDto): Promise<PharmaDispatch> {
    const dispatch = this.dispatchRepository.create({
      ...data,
      dispatchNumber: this.generateDispatchNumber(),
      status: PharmaDispatchStatus.PENDING,
      temperatureControl: data.temperatureControl || TemperatureControlType.NONE,
      requiresColdChain: data.requiresColdChain || false,
      isNarcotics: data.isNarcotics || false,
      retryCount: 0,
    });

    return await this.dispatchRepository.save(dispatch);
  }

  /**
   * ID로 조회
   */
  async findById(id: string): Promise<PharmaDispatch | null> {
    return await this.dispatchRepository.findOne({
      where: { id },
      relations: ['order'],
    });
  }

  /**
   * 주문 ID로 조회
   */
  async findByOrderId(orderId: string): Promise<PharmaDispatch | null> {
    return await this.dispatchRepository.findOne({
      where: { orderId },
      relations: ['order'],
    });
  }

  /**
   * 필터 조회
   */
  async find(filter: PharmaDispatchFilter): Promise<{
    items: PharmaDispatch[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.dispatchRepository.createQueryBuilder('dispatch');

    // Apply filters
    if (filter.orderId) {
      queryBuilder.andWhere('dispatch.orderId = :orderId', { orderId: filter.orderId });
    }

    if (filter.status) {
      queryBuilder.andWhere('dispatch.status = :status', { status: filter.status });
    }

    if (filter.carrierName) {
      queryBuilder.andWhere('dispatch.carrierName = :carrierName', { carrierName: filter.carrierName });
    }

    if (filter.requiresColdChain !== undefined) {
      queryBuilder.andWhere('dispatch.requiresColdChain = :requiresColdChain', {
        requiresColdChain: filter.requiresColdChain,
      });
    }

    if (filter.isNarcotics !== undefined) {
      queryBuilder.andWhere('dispatch.isNarcotics = :isNarcotics', {
        isNarcotics: filter.isNarcotics,
      });
    }

    if (filter.startDate) {
      queryBuilder.andWhere('dispatch.createdAt >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      queryBuilder.andWhere('dispatch.createdAt <= :endDate', { endDate: filter.endDate });
    }

    queryBuilder.orderBy('dispatch.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * 출고 정보 업데이트
   */
  async update(id: string, data: UpdatePharmaDispatchDto): Promise<PharmaDispatch | null> {
    const dispatch = await this.findById(id);
    if (!dispatch) {
      return null;
    }

    // Update fields
    if (data.status !== undefined) dispatch.status = data.status;
    if (data.carrierName !== undefined) dispatch.carrierName = data.carrierName;
    if (data.trackingNumber !== undefined) dispatch.trackingNumber = data.trackingNumber;
    if (data.trackingUrl !== undefined) dispatch.trackingUrl = data.trackingUrl;
    if (data.dispatchedAt !== undefined) dispatch.dispatchedAt = data.dispatchedAt;
    if (data.deliveredAt !== undefined) dispatch.deliveredAt = data.deliveredAt;
    if (data.driverInfo !== undefined) dispatch.driverInfo = data.driverInfo;
    if (data.deliveryConfirmation !== undefined) dispatch.deliveryConfirmation = data.deliveryConfirmation;
    if (data.failureReason !== undefined) dispatch.failureReason = data.failureReason;
    if (data.estimatedDeliveryAt !== undefined) dispatch.estimatedDeliveryAt = data.estimatedDeliveryAt;
    if (data.metadata !== undefined) dispatch.metadata = { ...dispatch.metadata, ...data.metadata };

    return await this.dispatchRepository.save(dispatch);
  }

  /**
   * 출고 상태 변경
   */
  async updateStatus(id: string, status: PharmaDispatchStatus): Promise<PharmaDispatch | null> {
    const dispatch = await this.findById(id);
    if (!dispatch) {
      return null;
    }

    dispatch.status = status;

    // Auto-set timestamps
    if (status === PharmaDispatchStatus.DISPATCHED) {
      dispatch.dispatchedAt = new Date();
    } else if (status === PharmaDispatchStatus.DELIVERED) {
      dispatch.deliveredAt = new Date();
    }

    return await this.dispatchRepository.save(dispatch);
  }

  /**
   * 배송 추적 정보 업데이트
   */
  async updateTracking(
    id: string,
    carrierName: string,
    trackingNumber: string,
    trackingUrl?: string
  ): Promise<PharmaDispatch | null> {
    return await this.update(id, {
      carrierName,
      trackingNumber,
      trackingUrl,
      status: PharmaDispatchStatus.DISPATCHED,
      dispatchedAt: new Date(),
    });
  }

  /**
   * 온도 로그 추가
   */
  async addTemperatureLog(
    id: string,
    temperature: number,
    location?: string
  ): Promise<PharmaDispatch | null> {
    const dispatch = await this.findById(id);
    if (!dispatch) {
      return null;
    }

    const log = {
      timestamp: new Date(),
      temperature,
      location,
    };

    dispatch.temperatureLogs = [...(dispatch.temperatureLogs || []), log];

    return await this.dispatchRepository.save(dispatch);
  }

  /**
   * 배송 완료 처리
   */
  async confirmDelivery(
    id: string,
    confirmation: {
      receiverName: string;
      receiverSignature?: string;
      notes?: string;
    }
  ): Promise<PharmaDispatch | null> {
    const dispatch = await this.findById(id);
    if (!dispatch) {
      return null;
    }

    dispatch.status = PharmaDispatchStatus.DELIVERED;
    dispatch.deliveredAt = new Date();
    dispatch.deliveryConfirmation = {
      ...confirmation,
      receivedAt: new Date(),
    };

    return await this.dispatchRepository.save(dispatch);
  }

  /**
   * 배송 실패 처리
   */
  async markAsFailed(id: string, reason: string): Promise<PharmaDispatch | null> {
    const dispatch = await this.findById(id);
    if (!dispatch) {
      return null;
    }

    dispatch.status = PharmaDispatchStatus.FAILED;
    dispatch.failureReason = reason;
    dispatch.retryCount = dispatch.retryCount + 1;

    return await this.dispatchRepository.save(dispatch);
  }

  /**
   * 냉장/냉동 배송 목록 조회
   */
  async findColdChainDispatches(filter?: {
    status?: PharmaDispatchStatus;
    page?: number;
    limit?: number;
  }): Promise<PharmaDispatch[]> {
    const result = await this.find({
      ...filter,
      requiresColdChain: true,
    });
    return result.items;
  }

  /**
   * 마약류 배송 목록 조회
   */
  async findNarcoticsDispatches(filter?: {
    status?: PharmaDispatchStatus;
    page?: number;
    limit?: number;
  }): Promise<PharmaDispatch[]> {
    const result = await this.find({
      ...filter,
      isNarcotics: true,
    });
    return result.items;
  }
}
