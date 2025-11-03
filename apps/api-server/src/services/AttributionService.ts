import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { ConversionEvent, ConversionType, AttributionModel, ConversionStatus } from '../entities/ConversionEvent.js';
import { ReferralClick, ClickStatus } from '../entities/ReferralClick.js';
import { Partner } from '../entities/Partner.js';
import { Product } from '../entities/Product.js';
import logger from '../utils/logger.js';

export interface CreateConversionRequest {
  orderId: string;
  productId: string;
  referralCode: string;
  orderAmount: number;
  productPrice: number;
  quantity?: number;
  currency?: string;
  customerId?: string;
  isNewCustomer?: boolean;
  attributionModel?: AttributionModel;
  attributionWindowDays?: number;
  metadata?: Record<string, any>;
}

export interface ConversionFilters {
  partnerId?: string;
  orderId?: string;
  referralCode?: string;
  status?: ConversionStatus;
  conversionType?: ConversionType;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  isNewCustomer?: boolean;
  sortBy?: 'createdAt' | 'convertedAt' | 'orderAmount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AttributionPath {
  clickId: string;
  timestamp: Date;
  weight: number;
}

export class AttributionService {
  private conversionRepository: Repository<ConversionEvent>;
  private clickRepository: Repository<ReferralClick>;
  private partnerRepository: Repository<Partner>;
  private productRepository: Repository<Product>;

  constructor() {
    this.conversionRepository = AppDataSource.getRepository(ConversionEvent);
    this.clickRepository = AppDataSource.getRepository(ReferralClick);
    this.partnerRepository = AppDataSource.getRepository(Partner);
    this.productRepository = AppDataSource.getRepository(Product);
  }

  /**
   * Create conversion event with attribution
   */
  async createConversion(data: CreateConversionRequest): Promise<ConversionEvent> {
    try {
      // 1. Generate idempotency key
      const idempotencyKey = `${data.orderId}-${data.productId}-${data.referralCode}`;

      // 2. Check for duplicate conversion
      const existing = await this.conversionRepository.findOne({
        where: { idempotencyKey }
      });

      if (existing) {
        logger.warn(`Duplicate conversion attempt: ${idempotencyKey}`);
        return existing;
      }

      // 3. Find partner by referral code
      const partner = await this.partnerRepository.findOne({
        where: { referralCode: data.referralCode }
      });

      if (!partner) {
        throw new Error(`Partner not found for referral code: ${data.referralCode}`);
      }

      // 4. Verify product exists
      const product = await this.productRepository.findOne({
        where: { id: data.productId }
      });

      if (!product) {
        throw new Error(`Product not found: ${data.productId}`);
      }

      // 5. Find attributed click(s)
      const attributionWindowDays = data.attributionWindowDays || 30;
      const attributionModel = data.attributionModel || AttributionModel.LAST_TOUCH;

      const attributionResult = await this.calculateAttribution(
        partner.id,
        data.referralCode,
        data.productId,
        attributionWindowDays,
        attributionModel
      );

      if (!attributionResult.primaryClick) {
        throw new Error('No valid click found within attribution window');
      }

      // 6. Determine conversion type
      const conversionType = this.determineConversionType(
        attributionResult.totalClicks,
        data.isNewCustomer
      );

      // 7. Calculate conversion time
      const clickedAt = attributionResult.primaryClick.createdAt;
      const convertedAt = new Date();
      const conversionTimeMinutes = Math.floor(
        (convertedAt.getTime() - clickedAt.getTime()) / (1000 * 60)
      );

      // 8. Check attribution window validity
      const isWithinWindow = this.isWithinAttributionWindow(
        clickedAt,
        convertedAt,
        attributionWindowDays
      );

      // 9. Create conversion event
      const conversion = this.conversionRepository.create({
        partnerId: partner.id,
        orderId: data.orderId,
        productId: data.productId,
        referralClickId: attributionResult.primaryClick.id,
        referralCode: data.referralCode,
        conversionType,
        attributionModel,
        status: ConversionStatus.PENDING,
        orderAmount: data.orderAmount,
        productPrice: data.productPrice,
        quantity: data.quantity || 1,
        currency: data.currency || 'KRW',
        attributionWeight: attributionResult.attributionWeight,
        attributionPath: attributionResult.attributionPath,
        clickedAt,
        convertedAt,
        conversionTimeMinutes,
        attributionWindowDays,
        isWithinAttributionWindow: isWithinWindow,
        campaign: attributionResult.primaryClick.campaign,
        medium: attributionResult.primaryClick.medium,
        source: attributionResult.primaryClick.source,
        customerId: data.customerId,
        isNewCustomer: data.isNewCustomer || false,
        isRepeatCustomer: data.isNewCustomer === false,
        idempotencyKey,
        metadata: data.metadata
      });

      const savedConversion = await this.conversionRepository.save(conversion);

      // 10. Mark click as converted
      attributionResult.primaryClick.hasConverted = true;
      attributionResult.primaryClick.conversionId = savedConversion.id;
      attributionResult.primaryClick.convertedAt = convertedAt;
      await this.clickRepository.save(attributionResult.primaryClick);

      // 11. Update partner stats
      partner.totalOrders = (partner.totalOrders || 0) + 1;
      if (partner.totalClicks > 0) {
        partner.conversionRate = ((partner.totalOrders / partner.totalClicks) * 100);
      }
      await this.partnerRepository.save(partner);

      logger.info(
        `Conversion created: ${savedConversion.id} (order: ${data.orderId}, partner: ${partner.id}, model: ${attributionModel})`
      );

      return savedConversion;

    } catch (error) {
      logger.error('Error creating conversion:', error);
      throw error;
    }
  }

  /**
   * Calculate attribution based on model
   */
  private async calculateAttribution(
    partnerId: string,
    referralCode: string,
    productId: string,
    windowDays: number,
    model: AttributionModel
  ): Promise<{
    primaryClick: ReferralClick;
    attributionWeight: number;
    totalClicks: number;
    attributionPath?: AttributionPath[];
  }> {
    // Find all valid clicks within attribution window
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const clicks = await this.clickRepository
      .createQueryBuilder('click')
      .where('click.partnerId = :partnerId', { partnerId })
      .andWhere('click.referralCode = :referralCode', { referralCode })
      .andWhere('click.status = :status', { status: ClickStatus.VALID })
      .andWhere('click.createdAt >= :windowStart', { windowStart })
      .andWhere('click.hasConverted = false') // Not already converted
      .orderBy('click.createdAt', 'ASC')
      .getMany();

    if (clicks.length === 0) {
      throw new Error('No valid clicks found within attribution window');
    }

    let primaryClick: ReferralClick;
    let attributionWeight: number;
    let attributionPath: AttributionPath[] | undefined;

    switch (model) {
      case AttributionModel.LAST_TOUCH:
        // Last click gets 100% credit
        primaryClick = clicks[clicks.length - 1];
        attributionWeight = 1.0;
        attributionPath = [
          {
            clickId: primaryClick.id,
            timestamp: primaryClick.createdAt,
            weight: 1.0
          }
        ];
        break;

      case AttributionModel.FIRST_TOUCH:
        // First click gets 100% credit
        primaryClick = clicks[0];
        attributionWeight = 1.0;
        attributionPath = [
          {
            clickId: primaryClick.id,
            timestamp: primaryClick.createdAt,
            weight: 1.0
          }
        ];
        break;

      case AttributionModel.LINEAR:
        // Equal credit to all clicks, use last as primary
        primaryClick = clicks[clicks.length - 1];
        attributionWeight = 1.0 / clicks.length;
        attributionPath = clicks.map(click => ({
          clickId: click.id,
          timestamp: click.createdAt,
          weight: 1.0 / clicks.length
        }));
        break;

      case AttributionModel.TIME_DECAY:
        // More recent clicks get more credit (exponential decay)
        primaryClick = clicks[clicks.length - 1];
        const weights = this.calculateTimeDecayWeights(clicks);
        attributionWeight = weights[weights.length - 1];
        attributionPath = clicks.map((click, i) => ({
          clickId: click.id,
          timestamp: click.createdAt,
          weight: weights[i]
        }));
        break;

      case AttributionModel.POSITION_BASED:
        // 40% first, 40% last, 20% middle
        primaryClick = clicks[clicks.length - 1];
        const posWeights = this.calculatePositionBasedWeights(clicks);
        attributionWeight = posWeights[posWeights.length - 1];
        attributionPath = clicks.map((click, i) => ({
          clickId: click.id,
          timestamp: click.createdAt,
          weight: posWeights[i]
        }));
        break;

      default:
        throw new Error(`Unknown attribution model: ${model}`);
    }

    return {
      primaryClick,
      attributionWeight,
      totalClicks: clicks.length,
      attributionPath
    };
  }

  /**
   * Calculate time-decay weights (exponential decay with half-life of 7 days)
   */
  private calculateTimeDecayWeights(clicks: ReferralClick[]): number[] {
    if (clicks.length === 1) {
      return [1.0];
    }

    const now = new Date().getTime();
    const halfLifeDays = 7;
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;

    // Calculate raw weights
    const rawWeights = clicks.map(click => {
      const ageMs = now - click.createdAt.getTime();
      return Math.pow(0.5, ageMs / halfLifeMs);
    });

    // Normalize to sum to 1.0
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    return rawWeights.map(w => w / sum);
  }

  /**
   * Calculate position-based weights (40% first, 40% last, 20% middle)
   */
  private calculatePositionBasedWeights(clicks: ReferralClick[]): number[] {
    if (clicks.length === 1) {
      return [1.0];
    }

    if (clicks.length === 2) {
      return [0.4, 0.4]; // Only first and last
    }

    const weights = new Array(clicks.length).fill(0);

    // 40% to first
    weights[0] = 0.4;

    // 40% to last
    weights[weights.length - 1] = 0.4;

    // 20% distributed among middle clicks
    const middleCount = clicks.length - 2;
    const middleWeight = 0.2 / middleCount;

    for (let i = 1; i < weights.length - 1; i++) {
      weights[i] = middleWeight;
    }

    return weights;
  }

  /**
   * Determine conversion type
   */
  private determineConversionType(totalClicks: number, isNewCustomer?: boolean): ConversionType {
    if (isNewCustomer === false) {
      return ConversionType.REPEAT_PURCHASE;
    }

    if (totalClicks === 1) {
      return ConversionType.DIRECT_PURCHASE;
    }

    return ConversionType.ASSISTED_PURCHASE;
  }

  /**
   * Check if conversion is within attribution window
   */
  private isWithinAttributionWindow(clickedAt: Date, convertedAt: Date, windowDays: number): boolean {
    const diffMs = convertedAt.getTime() - clickedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= windowDays;
  }

  /**
   * Confirm conversion (when order is confirmed)
   */
  async confirmConversion(conversionId: string): Promise<ConversionEvent> {
    try {
      const conversion = await this.conversionRepository.findOne({
        where: { id: conversionId }
      });

      if (!conversion) {
        throw new Error('Conversion not found');
      }

      if (conversion.status !== ConversionStatus.PENDING) {
        throw new Error(`Conversion is not pending (current status: ${conversion.status})`);
      }

      conversion.markAsConfirmed();

      const updated = await this.conversionRepository.save(conversion);

      logger.info(`Conversion confirmed: ${conversionId}`);

      return updated;

    } catch (error) {
      logger.error('Error confirming conversion:', error);
      throw error;
    }
  }

  /**
   * Cancel conversion (when order is cancelled)
   */
  async cancelConversion(conversionId: string): Promise<ConversionEvent> {
    try {
      const conversion = await this.conversionRepository.findOne({
        where: { id: conversionId }
      });

      if (!conversion) {
        throw new Error('Conversion not found');
      }

      conversion.markAsCancelled();

      const updated = await this.conversionRepository.save(conversion);

      logger.info(`Conversion cancelled: ${conversionId}`);

      return updated;

    } catch (error) {
      logger.error('Error cancelling conversion:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    conversionId: string,
    refundAmount: number,
    refundQuantity: number = 0
  ): Promise<ConversionEvent> {
    try {
      const conversion = await this.conversionRepository.findOne({
        where: { id: conversionId }
      });

      if (!conversion) {
        throw new Error('Conversion not found');
      }

      if (conversion.status !== ConversionStatus.CONFIRMED) {
        throw new Error(`Conversion must be confirmed to process refund (current status: ${conversion.status})`);
      }

      conversion.processRefund(refundAmount, refundQuantity);

      const updated = await this.conversionRepository.save(conversion);

      logger.info(
        `Refund processed: ${conversionId} (amount: ${refundAmount}, status: ${updated.status})`
      );

      return updated;

    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get conversion by ID
   */
  async getConversion(id: string): Promise<ConversionEvent | null> {
    try {
      return await this.conversionRepository.findOne({
        where: { id },
        relations: ['partner', 'product', 'referralClick']
      });
    } catch (error) {
      logger.error('Error fetching conversion:', error);
      throw error;
    }
  }

  /**
   * Get conversion by order ID
   */
  async getConversionByOrder(orderId: string): Promise<ConversionEvent[]> {
    try {
      return await this.conversionRepository.find({
        where: { orderId },
        relations: ['partner', 'product', 'referralClick']
      });
    } catch (error) {
      logger.error('Error fetching conversions by order:', error);
      throw error;
    }
  }

  /**
   * Get conversions with filters
   */
  async getConversions(filters: ConversionFilters = {}) {
    try {
      const {
        partnerId,
        orderId,
        referralCode,
        status,
        conversionType,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        isNewCustomer,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 50
      } = filters;

      const queryBuilder = this.conversionRepository
        .createQueryBuilder('conversion')
        .leftJoinAndSelect('conversion.partner', 'partner')
        .leftJoinAndSelect('conversion.product', 'product')
        .leftJoinAndSelect('conversion.referralClick', 'referralClick');

      if (partnerId) {
        queryBuilder.andWhere('conversion.partnerId = :partnerId', { partnerId });
      }

      if (orderId) {
        queryBuilder.andWhere('conversion.orderId = :orderId', { orderId });
      }

      if (referralCode) {
        queryBuilder.andWhere('conversion.referralCode = :referralCode', { referralCode });
      }

      if (status) {
        queryBuilder.andWhere('conversion.status = :status', { status });
      }

      if (conversionType) {
        queryBuilder.andWhere('conversion.conversionType = :conversionType', { conversionType });
      }

      if (dateFrom) {
        queryBuilder.andWhere('conversion.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('conversion.createdAt <= :dateTo', { dateTo });
      }

      if (minAmount !== undefined) {
        queryBuilder.andWhere('conversion.orderAmount >= :minAmount', { minAmount });
      }

      if (maxAmount !== undefined) {
        queryBuilder.andWhere('conversion.orderAmount <= :maxAmount', { maxAmount });
      }

      if (isNewCustomer !== undefined) {
        queryBuilder.andWhere('conversion.isNewCustomer = :isNewCustomer', { isNewCustomer });
      }

      const sortField = `conversion.${sortBy}`;
      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [conversions, total] = await queryBuilder.getManyAndCount();

      return {
        conversions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching conversions:', error);
      throw error;
    }
  }

  /**
   * Get conversion stats
   */
  async getConversionStats(partnerId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const queryBuilder = this.conversionRepository
        .createQueryBuilder('conversion')
        .select([
          'COUNT(*) as totalConversions',
          'COUNT(CASE WHEN conversion.status = :pending THEN 1 END) as pendingConversions',
          'COUNT(CASE WHEN conversion.status = :confirmed THEN 1 END) as confirmedConversions',
          'COUNT(CASE WHEN conversion.status = :cancelled THEN 1 END) as cancelledConversions',
          'COUNT(CASE WHEN conversion.status = :refunded THEN 1 END) as refundedConversions',
          'SUM(conversion.orderAmount) as totalRevenue',
          'SUM(conversion.refundedAmount) as totalRefunded',
          'SUM(conversion.orderAmount - conversion.refundedAmount) as netRevenue',
          'AVG(conversion.orderAmount) as averageOrderValue',
          'AVG(conversion.conversionTimeMinutes) as averageConversionTime',
          'COUNT(CASE WHEN conversion.isNewCustomer = true THEN 1 END) as newCustomerConversions',
          'COUNT(CASE WHEN conversion.isRepeatCustomer = true THEN 1 END) as repeatCustomerConversions'
        ])
        .where('conversion.partnerId = :partnerId', { partnerId })
        .setParameters({
          pending: ConversionStatus.PENDING,
          confirmed: ConversionStatus.CONFIRMED,
          cancelled: ConversionStatus.CANCELLED,
          refunded: ConversionStatus.REFUNDED
        });

      if (dateFrom) {
        queryBuilder.andWhere('conversion.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('conversion.createdAt <= :dateTo', { dateTo });
      }

      const stats = await queryBuilder.getRawOne();

      return {
        totalConversions: parseInt(stats.totalConversions) || 0,
        pendingConversions: parseInt(stats.pendingConversions) || 0,
        confirmedConversions: parseInt(stats.confirmedConversions) || 0,
        cancelledConversions: parseInt(stats.cancelledConversions) || 0,
        refundedConversions: parseInt(stats.refundedConversions) || 0,
        totalRevenue: parseFloat(stats.totalRevenue) || 0,
        totalRefunded: parseFloat(stats.totalRefunded) || 0,
        netRevenue: parseFloat(stats.netRevenue) || 0,
        averageOrderValue: parseFloat(stats.averageOrderValue) || 0,
        averageConversionTime: Math.round(parseFloat(stats.averageConversionTime) || 0),
        newCustomerConversions: parseInt(stats.newCustomerConversions) || 0,
        repeatCustomerConversions: parseInt(stats.repeatCustomerConversions) || 0,
        period: { from: dateFrom, to: dateTo }
      };

    } catch (error) {
      logger.error('Error fetching conversion stats:', error);
      throw error;
    }
  }
}

export default AttributionService;
