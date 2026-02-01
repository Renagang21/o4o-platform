import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import {
  NetureSupplier,
  NetureSupplierProduct,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
  NetureSupplierRequest,
  NetureSupplierContent,
  NetureSupplierRequestEvent,
  SupplierStatus,
  PartnershipStatus,
  SupplierRequestStatus,
  ProductPurpose,
  ContentType,
  ContentStatus,
  RequestEventType,
} from './entities/index.js';
import logger from '../../utils/logger.js';

export class NetureService {
  // Lazy initialization: repositories are created on first access
  private _supplierRepo?: Repository<NetureSupplier>;
  private _productRepo?: Repository<NetureSupplierProduct>;
  private _partnershipRepo?: Repository<NeturePartnershipRequest>;
  private _partnershipProductRepo?: Repository<NeturePartnershipProduct>;
  private _supplierRequestRepo?: Repository<NetureSupplierRequest>;
  private _contentRepo?: Repository<NetureSupplierContent>;
  private _requestEventRepo?: Repository<NetureSupplierRequestEvent>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  private get productRepo(): Repository<NetureSupplierProduct> {
    if (!this._productRepo) {
      this._productRepo = AppDataSource.getRepository(NetureSupplierProduct);
    }
    return this._productRepo;
  }

  private get partnershipRepo(): Repository<NeturePartnershipRequest> {
    if (!this._partnershipRepo) {
      this._partnershipRepo = AppDataSource.getRepository(NeturePartnershipRequest);
    }
    return this._partnershipRepo;
  }

  private get partnershipProductRepo(): Repository<NeturePartnershipProduct> {
    if (!this._partnershipProductRepo) {
      this._partnershipProductRepo = AppDataSource.getRepository(NeturePartnershipProduct);
    }
    return this._partnershipProductRepo;
  }

  private get supplierRequestRepo(): Repository<NetureSupplierRequest> {
    if (!this._supplierRequestRepo) {
      this._supplierRequestRepo = AppDataSource.getRepository(NetureSupplierRequest);
    }
    return this._supplierRequestRepo;
  }

  private get contentRepo(): Repository<NetureSupplierContent> {
    if (!this._contentRepo) {
      this._contentRepo = AppDataSource.getRepository(NetureSupplierContent);
    }
    return this._contentRepo;
  }

  private get requestEventRepo(): Repository<NetureSupplierRequestEvent> {
    if (!this._requestEventRepo) {
      this._requestEventRepo = AppDataSource.getRepository(NetureSupplierRequestEvent);
    }
    return this._requestEventRepo;
  }

  // ==================== User-Supplier Linking ====================

  /**
   * Get supplier ID by user ID
   * Used to link authenticated user to their supplier account
   */
  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { userId },
        select: ['id'],
      });
      return supplier?.id || null;
    } catch (error) {
      logger.error('[NetureService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  /**
   * Get supplier by user ID
   */
  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    try {
      return await this.supplierRepo.findOne({
        where: { userId },
        relations: ['products'],
      });
    } catch (error) {
      logger.error('[NetureService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  // ==================== Suppliers ====================

  /**
   * GET /suppliers - List all suppliers
   */
  async getSuppliers(filters?: {
    category?: string;
    status?: SupplierStatus;
  }) {
    try {
      const query = this.supplierRepo
        .createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.products', 'products');

      // Apply filters
      if (filters?.category) {
        query.andWhere('supplier.category = :category', { category: filters.category });
      }

      if (filters?.status) {
        query.andWhere('supplier.status = :status', { status: filters.status });
      } else {
        // Default: Only show ACTIVE suppliers
        query.andWhere('supplier.status = :status', { status: SupplierStatus.ACTIVE });
      }

      query.orderBy('supplier.createdAt', 'DESC');

      const suppliers = await query.getMany();

      return suppliers.map((supplier) => ({
        id: supplier.id,
        slug: supplier.slug,
        name: supplier.name,
        logo: supplier.logoUrl,
        category: supplier.category,
        shortDescription: supplier.shortDescription,
        productCount: supplier.products?.length || 0,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching suppliers:', error);
      throw error;
    }
  }

  /**
   * GET /suppliers/:slug - Get supplier detail
   */
  async getSupplierBySlug(slug: string) {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { slug, status: SupplierStatus.ACTIVE },
        relations: ['products'],
      });

      if (!supplier) {
        return null;
      }

      return {
        id: supplier.id,
        slug: supplier.slug,
        name: supplier.name,
        logo: supplier.logoUrl,
        category: supplier.category,
        shortDescription: supplier.shortDescription,
        description: supplier.description,
        products: supplier.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
        })),
        pricingPolicy: supplier.pricingPolicy,
        moq: supplier.moq,
        shippingPolicy: {
          standard: supplier.shippingStandard,
          island: supplier.shippingIsland,
          mountain: supplier.shippingMountain,
        },
        contact: {
          email: supplier.contactEmail,
          phone: supplier.contactPhone,
          website: supplier.contactWebsite,
          kakao: supplier.contactKakao,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier by slug:', error);
      throw error;
    }
  }

  // ==================== Partnership Requests ====================

  /**
   * GET /partnership/requests - List all partnership requests
   */
  async getPartnershipRequests(filters?: { status?: PartnershipStatus }) {
    try {
      const query = this.partnershipRepo
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.products', 'products');

      // Apply status filter
      if (filters?.status) {
        query.andWhere('request.status = :status', { status: filters.status });
      }

      query.orderBy('request.createdAt', 'DESC');

      const requests = await query.getMany();

      return requests.map((req) => ({
        id: req.id,
        seller: {
          id: req.sellerId,
          name: req.sellerName,
          serviceType: req.sellerServiceType,
          storeUrl: req.sellerStoreUrl,
        },
        productCount: req.productCount,
        period: {
          start: req.periodStart,
          end: req.periodEnd,
        },
        revenueStructure: req.revenueStructure,
        status: req.status,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching partnership requests:', error);
      throw error;
    }
  }

  /**
   * GET /partnership/requests/:id - Get partnership request detail
   */
  async getPartnershipRequestById(id: string) {
    try {
      const request = await this.partnershipRepo.findOne({
        where: { id },
        relations: ['products'],
      });

      if (!request) {
        return null;
      }

      return {
        id: request.id,
        seller: {
          id: request.sellerId,
          name: request.sellerName,
          serviceType: request.sellerServiceType,
          storeUrl: request.sellerStoreUrl,
        },
        productCount: request.productCount,
        period: {
          start: request.periodStart,
          end: request.periodEnd,
        },
        revenueStructure: request.revenueStructure,
        status: request.status,
        products: request.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
        })),
        promotionScope: {
          sns: request.promotionSns,
          content: request.promotionContent,
          banner: request.promotionBanner,
          other: request.promotionOther,
        },
        contact: {
          email: request.contactEmail,
          phone: request.contactPhone,
          kakao: request.contactKakao,
        },
        createdAt: request.createdAt,
        matchedAt: request.matchedAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching partnership request by ID:', error);
      throw error;
    }
  }

  // ==================== P2: CREATE Operations ====================

  /**
   * POST /partnership/requests - Create a new partnership request
   */
  async createPartnershipRequest(data: {
    sellerId: string;
    sellerName: string;
    sellerServiceType?: string;
    sellerStoreUrl?: string;
    periodStart?: string;
    periodEnd?: string;
    revenueStructure?: string;
    promotionSns?: boolean;
    promotionContent?: boolean;
    promotionBanner?: boolean;
    promotionOther?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactKakao?: string;
    products?: Array<{ name: string; category?: string }>;
  }) {
    try {
      // Create partnership request
      const request = this.partnershipRepo.create({
        sellerId: data.sellerId,
        sellerName: data.sellerName,
        sellerServiceType: data.sellerServiceType || '',
        sellerStoreUrl: data.sellerStoreUrl || '',
        productCount: data.products?.length || 0,
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        revenueStructure: data.revenueStructure || '',
        status: PartnershipStatus.OPEN,
        promotionSns: data.promotionSns || false,
        promotionContent: data.promotionContent || false,
        promotionBanner: data.promotionBanner || false,
        promotionOther: data.promotionOther || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        contactKakao: data.contactKakao || '',
      });

      const savedRequest = await this.partnershipRepo.save(request);

      // Create products if provided
      if (data.products && data.products.length > 0) {
        for (const product of data.products) {
          const partnershipProduct = this.partnershipProductRepo.create({
            partnershipRequestId: savedRequest.id,
            name: product.name,
            category: product.category || '',
          });
          await this.partnershipProductRepo.save(partnershipProduct);
        }
      }

      logger.info(`[NetureService] Created partnership request: ${savedRequest.id}`);

      return {
        id: savedRequest.id,
        status: savedRequest.status,
        createdAt: savedRequest.createdAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error creating partnership request:', error);
      throw error;
    }
  }

  /**
   * PATCH /partnership/requests/:id - Update partnership request status
   */
  async updatePartnershipRequestStatus(id: string, status: PartnershipStatus) {
    try {
      const request = await this.partnershipRepo.findOne({ where: { id } });

      if (!request) {
        return null;
      }

      request.status = status;

      // Set matchedAt timestamp when status changes to MATCHED
      if (status === PartnershipStatus.MATCHED && !request.matchedAt) {
        request.matchedAt = new Date();
      }

      const updatedRequest = await this.partnershipRepo.save(request);

      logger.info(`[NetureService] Updated partnership request ${id} status to ${status}`);

      return {
        id: updatedRequest.id,
        status: updatedRequest.status,
      };
    } catch (error) {
      logger.error('[NetureService] Error updating partnership request status:', error);
      throw error;
    }
  }

  // ==================== Supplier Requests (WO-NETURE-SUPPLIER-REQUEST-API-V1) ====================

  /**
   * GET /supplier/requests - 공급자에게 들어온 신청 목록
   */
  async getSupplierRequests(
    supplierId: string,
    filters?: { status?: SupplierRequestStatus; serviceId?: string }
  ) {
    try {
      const query = this.supplierRequestRepo
        .createQueryBuilder('request')
        .where('request.supplierId = :supplierId', { supplierId });

      if (filters?.status) {
        query.andWhere('request.status = :status', { status: filters.status });
      }

      if (filters?.serviceId) {
        query.andWhere('request.serviceId = :serviceId', { serviceId: filters.serviceId });
      }

      query.orderBy('request.createdAt', 'DESC');

      const requests = await query.getMany();

      return requests.map((req) => ({
        id: req.id,
        status: req.status,
        sellerName: req.sellerName,
        sellerEmail: req.sellerEmail,
        serviceName: req.serviceName,
        serviceId: req.serviceId,
        productName: req.productName,
        productId: req.productId,
        productPurpose: req.productPurpose,
        requestedAt: req.createdAt,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier requests:', error);
      throw error;
    }
  }

  /**
   * GET /supplier/requests/:id - 신청 상세 조회
   */
  async getSupplierRequestById(id: string, supplierId: string) {
    try {
      const request = await this.supplierRequestRepo.findOne({
        where: { id, supplierId },
      });

      if (!request) {
        return null;
      }

      return {
        id: request.id,
        status: request.status,
        seller: {
          id: request.sellerId,
          name: request.sellerName,
          email: request.sellerEmail,
          phone: request.sellerPhone,
          storeUrl: request.sellerStoreUrl,
        },
        service: {
          id: request.serviceId,
          name: request.serviceName,
        },
        product: {
          id: request.productId,
          name: request.productName,
          category: request.productCategory,
          purpose: request.productPurpose,
        },
        decidedBy: request.decidedBy,
        decidedAt: request.decidedAt,
        rejectReason: request.rejectReason,
        createdAt: request.createdAt,
        metadata: request.metadata,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier request by ID:', error);
      throw error;
    }
  }

  /**
   * POST /supplier/requests/:id/approve - 신청 승인
   *
   * 상태 전이: pending → approved
   * 이벤트 로그 기록 (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.2)
   */
  async approveSupplierRequest(id: string, supplierId: string, actorName?: string) {
    try {
      const request = await this.supplierRequestRepo.findOne({
        where: { id, supplierId },
      });

      if (!request) {
        return { success: false, error: 'REQUEST_NOT_FOUND' };
      }

      // 상태 전이 규칙 검증
      if (request.status !== SupplierRequestStatus.PENDING) {
        return {
          success: false,
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot approve request with status: ${request.status}`,
        };
      }

      const fromStatus = request.status;

      // 승인 처리
      request.status = SupplierRequestStatus.APPROVED;
      request.decidedBy = supplierId;
      request.decidedAt = new Date();

      const updatedRequest = await this.supplierRequestRepo.save(request);

      // 이벤트 로그 기록
      const event = this.requestEventRepo.create({
        requestId: id,
        eventType: RequestEventType.APPROVED,
        actorId: supplierId,
        actorName: actorName || '',
        sellerId: request.sellerId,
        sellerName: request.sellerName,
        productId: request.productId,
        productName: request.productName,
        serviceId: request.serviceId,
        serviceName: request.serviceName,
        fromStatus,
        toStatus: SupplierRequestStatus.APPROVED,
      });
      await this.requestEventRepo.save(event);

      logger.info(`[NetureService] Approved supplier request ${id} by ${supplierId} (event: ${event.id})`);

      return {
        success: true,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          decidedBy: updatedRequest.decidedBy,
          decidedAt: updatedRequest.decidedAt,
          eventId: event.id,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error approving supplier request:', error);
      throw error;
    }
  }

  /**
   * POST /supplier/requests/:id/reject - 신청 거절
   *
   * 상태 전이: pending → rejected
   * 이벤트 로그 기록 (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.2)
   */
  async rejectSupplierRequest(id: string, supplierId: string, reason?: string, actorName?: string) {
    try {
      const request = await this.supplierRequestRepo.findOne({
        where: { id, supplierId },
      });

      if (!request) {
        return { success: false, error: 'REQUEST_NOT_FOUND' };
      }

      // 상태 전이 규칙 검증
      if (request.status !== SupplierRequestStatus.PENDING) {
        return {
          success: false,
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot reject request with status: ${request.status}`,
        };
      }

      const fromStatus = request.status;

      // 거절 처리
      request.status = SupplierRequestStatus.REJECTED;
      request.decidedBy = supplierId;
      request.decidedAt = new Date();
      request.rejectReason = reason || '';

      const updatedRequest = await this.supplierRequestRepo.save(request);

      // 이벤트 로그 기록
      const event = this.requestEventRepo.create({
        requestId: id,
        eventType: RequestEventType.REJECTED,
        actorId: supplierId,
        actorName: actorName || '',
        sellerId: request.sellerId,
        sellerName: request.sellerName,
        productId: request.productId,
        productName: request.productName,
        serviceId: request.serviceId,
        serviceName: request.serviceName,
        fromStatus,
        toStatus: SupplierRequestStatus.REJECTED,
        reason: reason || '',
      });
      await this.requestEventRepo.save(event);

      logger.info(`[NetureService] Rejected supplier request ${id} by ${supplierId} (event: ${event.id})`);

      return {
        success: true,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          decidedBy: updatedRequest.decidedBy,
          decidedAt: updatedRequest.decidedAt,
          rejectReason: updatedRequest.rejectReason,
          eventId: event.id,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error rejecting supplier request:', error);
      throw error;
    }
  }

  // ==================== Admin Request Management (WO-S2S-FLOW-RECOVERY-PHASE2-V1) ====================

  /**
   * Admin override: 소유권 검증 없이 승인
   * 상태 전이: pending → approved
   */
  async approveSupplierRequestAsAdmin(id: string, actorId: string, actorName?: string) {
    try {
      const request = await this.supplierRequestRepo.findOne({ where: { id } });

      if (!request) {
        return { success: false, error: 'REQUEST_NOT_FOUND' };
      }

      if (request.status !== SupplierRequestStatus.PENDING) {
        return {
          success: false,
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot approve request with status: ${request.status}`,
        };
      }

      const fromStatus = request.status;

      request.status = SupplierRequestStatus.APPROVED;
      request.decidedBy = actorId;
      request.decidedAt = new Date();

      const updatedRequest = await this.supplierRequestRepo.save(request);

      const event = this.requestEventRepo.create({
        requestId: id,
        eventType: RequestEventType.APPROVED,
        actorId,
        actorName: actorName || 'Admin',
        sellerId: request.sellerId,
        sellerName: request.sellerName,
        productId: request.productId,
        productName: request.productName,
        serviceId: request.serviceId,
        serviceName: request.serviceName,
        fromStatus,
        toStatus: SupplierRequestStatus.APPROVED,
      });
      await this.requestEventRepo.save(event);

      logger.info(`[NetureService] Admin approved supplier request ${id} by ${actorId} (event: ${event.id})`);

      return {
        success: true,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          decidedBy: updatedRequest.decidedBy,
          decidedAt: updatedRequest.decidedAt,
          eventId: event.id,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error admin-approving supplier request:', error);
      throw error;
    }
  }

  /**
   * Admin override: 소유권 검증 없이 거절
   * 상태 전이: pending → rejected
   */
  async rejectSupplierRequestAsAdmin(id: string, actorId: string, reason?: string, actorName?: string) {
    try {
      const request = await this.supplierRequestRepo.findOne({ where: { id } });

      if (!request) {
        return { success: false, error: 'REQUEST_NOT_FOUND' };
      }

      if (request.status !== SupplierRequestStatus.PENDING) {
        return {
          success: false,
          error: 'INVALID_STATUS_TRANSITION',
          message: `Cannot reject request with status: ${request.status}`,
        };
      }

      const fromStatus = request.status;

      request.status = SupplierRequestStatus.REJECTED;
      request.decidedBy = actorId;
      request.decidedAt = new Date();
      request.rejectReason = reason || '';

      const updatedRequest = await this.supplierRequestRepo.save(request);

      const event = this.requestEventRepo.create({
        requestId: id,
        eventType: RequestEventType.REJECTED,
        actorId,
        actorName: actorName || 'Admin',
        sellerId: request.sellerId,
        sellerName: request.sellerName,
        productId: request.productId,
        productName: request.productName,
        serviceId: request.serviceId,
        serviceName: request.serviceName,
        fromStatus,
        toStatus: SupplierRequestStatus.REJECTED,
        reason: reason || '',
      });
      await this.requestEventRepo.save(event);

      logger.info(`[NetureService] Admin rejected supplier request ${id} by ${actorId} (event: ${event.id})`);

      return {
        success: true,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          decidedBy: updatedRequest.decidedBy,
          decidedAt: updatedRequest.decidedAt,
          rejectReason: updatedRequest.rejectReason,
          eventId: event.id,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error admin-rejecting supplier request:', error);
      throw error;
    }
  }

  /**
   * Admin: 전체 취급 요청 목록 조회 (cross-supplier)
   */
  async getAllSupplierRequests(filters?: { status?: string; supplierId?: string; serviceId?: string }) {
    try {
      const query = this.supplierRequestRepo.createQueryBuilder('request');

      if (filters?.status) {
        query.andWhere('request.status = :status', { status: filters.status });
      }
      if (filters?.supplierId) {
        query.andWhere('request.supplierId = :supplierId', { supplierId: filters.supplierId });
      }
      if (filters?.serviceId) {
        query.andWhere('request.serviceId = :serviceId', { serviceId: filters.serviceId });
      }

      query.orderBy('request.createdAt', 'DESC');

      const requests = await query.getMany();

      return requests.map((req) => ({
        id: req.id,
        status: req.status,
        supplierId: req.supplierId,
        supplierName: req.supplierName,
        sellerName: req.sellerName,
        sellerEmail: req.sellerEmail,
        serviceName: req.serviceName,
        serviceId: req.serviceId,
        productName: req.productName,
        productId: req.productId,
        productPurpose: req.productPurpose,
        requestedAt: req.createdAt,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching all supplier requests:', error);
      throw error;
    }
  }

  // ==================== Seller Product Query (WO-S2S-FLOW-RECOVERY-PHASE3-V1 T1) ====================

  /**
   * 판매자의 승인된 취급 상품 목록 조회
   * sellerId로 APPROVED 상태인 요청만 반환
   */
  async getSellerApprovedProducts(sellerId: string) {
    try {
      const requests = await this.supplierRequestRepo.find({
        where: {
          sellerId,
          status: SupplierRequestStatus.APPROVED,
        },
        order: { decidedAt: 'DESC' },
      });

      return {
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          productId: r.productId,
          productName: r.productName,
          productCategory: r.productCategory,
          productPurpose: r.productPurpose,
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          approvedAt: r.decidedAt,
        })),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching seller approved products:', error);
      throw error;
    }
  }

  /**
   * 테스트용 신청 생성 (서비스에서 호출)
   */
  async createSupplierRequest(data: {
    supplierId: string;
    supplierName?: string;
    sellerId: string;
    sellerName: string;
    sellerEmail?: string;
    sellerPhone?: string;
    sellerStoreUrl?: string;
    serviceId: string;
    serviceName: string;
    productId: string;
    productName: string;
    productCategory?: string;
    productPurpose?: string;
  }) {
    try {
      // WO-S2S-FLOW-RECOVERY-PHASE1-V1: 중복 요청 방지
      // 동일 supplier + seller + product에 pending 또는 approved 상태가 존재하면 차단
      const existing = await this.supplierRequestRepo
        .createQueryBuilder('request')
        .where('request.supplierId = :supplierId', { supplierId: data.supplierId })
        .andWhere('request.sellerId = :sellerId', { sellerId: data.sellerId })
        .andWhere('request.productId = :productId', { productId: data.productId })
        .andWhere('request.status IN (:...statuses)', {
          statuses: [SupplierRequestStatus.PENDING, SupplierRequestStatus.APPROVED],
        })
        .getOne();

      if (existing) {
        const error = new Error('DUPLICATE_REQUEST');
        (error as any).existingStatus = existing.status;
        throw error;
      }

      const request = this.supplierRequestRepo.create({
        supplierId: data.supplierId,
        supplierName: data.supplierName || '',
        sellerId: data.sellerId,
        sellerName: data.sellerName,
        sellerEmail: data.sellerEmail || '',
        sellerPhone: data.sellerPhone || '',
        sellerStoreUrl: data.sellerStoreUrl || '',
        serviceId: data.serviceId,
        serviceName: data.serviceName,
        productId: data.productId,
        productName: data.productName,
        productCategory: data.productCategory || '',
        productPurpose: data.productPurpose || 'APPLICATION',
        status: SupplierRequestStatus.PENDING,
      });

      const savedRequest = await this.supplierRequestRepo.save(request);

      logger.info(`[NetureService] Created supplier request: ${savedRequest.id}`);

      return {
        id: savedRequest.id,
        status: savedRequest.status,
        createdAt: savedRequest.createdAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error creating supplier request:', error);
      throw error;
    }
  }

  // ==================== Supplier Products (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2) ====================

  /**
   * GET /supplier/products - 공급자의 제품 목록
   */
  async getSupplierProducts(supplierId: string) {
    try {
      const products = await this.productRepo.find({
        where: { supplierId },
        order: { createdAt: 'DESC' },
      });

      // 각 제품별 신청 대기 건수 조회
      const pendingCounts = await Promise.all(
        products.map(async (product) => {
          const count = await this.supplierRequestRepo.count({
            where: {
              supplierId,
              productId: product.id,
              status: SupplierRequestStatus.PENDING,
            },
          });
          return { productId: product.id, count };
        })
      );

      const pendingMap = new Map(pendingCounts.map((p) => [p.productId, p.count]));

      // 각 제품별 사용 서비스 수 (approved 상태 기준)
      const serviceCounts = await Promise.all(
        products.map(async (product) => {
          const count = await this.supplierRequestRepo
            .createQueryBuilder('request')
            .where('request.supplierId = :supplierId', { supplierId })
            .andWhere('request.productId = :productId', { productId: product.id })
            .andWhere('request.status = :status', { status: SupplierRequestStatus.APPROVED })
            .select('COUNT(DISTINCT request.serviceId)', 'count')
            .getRawOne();
          return { productId: product.id, count: parseInt(count?.count || '0', 10) };
        })
      );

      const serviceMap = new Map(serviceCounts.map((s) => [s.productId, s.count]));

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        purpose: product.purpose,
        isActive: product.isActive,
        acceptsApplications: product.acceptsApplications,
        pendingRequestCount: pendingMap.get(product.id) || 0,
        activeServiceCount: serviceMap.get(product.id) || 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier products:', error);
      throw error;
    }
  }

  /**
   * PATCH /supplier/products/:id - 제품 상태 업데이트
   *
   * 허용 액션:
   * - isActive 토글 (활성/비활성)
   * - acceptsApplications 토글 (신청 가능/불가)
   */
  async updateSupplierProduct(
    productId: string,
    supplierId: string,
    updates: { isActive?: boolean; acceptsApplications?: boolean }
  ) {
    try {
      const product = await this.productRepo.findOne({
        where: { id: productId, supplierId },
      });

      if (!product) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      if (updates.isActive !== undefined) {
        product.isActive = updates.isActive;
      }

      if (updates.acceptsApplications !== undefined) {
        product.acceptsApplications = updates.acceptsApplications;
      }

      const savedProduct = await this.productRepo.save(product);

      logger.info(`[NetureService] Updated product ${productId} by supplier ${supplierId}`);

      return {
        success: true,
        data: {
          id: savedProduct.id,
          isActive: savedProduct.isActive,
          acceptsApplications: savedProduct.acceptsApplications,
          updatedAt: savedProduct.updatedAt,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error updating supplier product:', error);
      throw error;
    }
  }

  // ==================== Order Summary (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4, P1 §3.3) ====================

  /**
   * GET /supplier/orders/summary - 서비스별 주문 요약
   *
   * Neture는 주문을 직접 처리하지 않음.
   * 서비스별 요약 정보만 제공하고 해당 서비스로 이동 링크 제공.
   *
   * P1 §3.3 정밀화:
   * - 최근 승인 발생 시점
   * - 각 서비스 상태 정보
   * - 서비스별 담당자 연락처
   */
  async getSupplierOrdersSummary(supplierId: string) {
    try {
      // 서비스별 승인된 신청 수 집계
      const approvedByService = await this.supplierRequestRepo
        .createQueryBuilder('request')
        .select('request.serviceId', 'serviceId')
        .addSelect('request.serviceName', 'serviceName')
        .addSelect('COUNT(*)', 'approvedCount')
        .addSelect('MAX(request.decidedAt)', 'lastApprovedAt')
        .where('request.supplierId = :supplierId', { supplierId })
        .andWhere('request.status = :status', { status: SupplierRequestStatus.APPROVED })
        .groupBy('request.serviceId')
        .addGroupBy('request.serviceName')
        .getRawMany();

      // 서비스 설정 (실제로는 DB나 설정에서 가져와야 함)
      const serviceConfig: Record<string, {
        url: string;
        ordersPath: string;
        supportEmail?: string;
        features: string[];
      }> = {
        glycopharm: {
          url: 'https://glycopharm.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@glycopharm.kr',
          features: ['주문관리', '배송조회', '반품처리'],
        },
        'k-cosmetics': {
          url: 'https://k-cosmetics.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@k-cosmetics.kr',
          features: ['주문관리', '배송조회'],
        },
        glucoseview: {
          url: 'https://glucoseview.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@glucoseview.kr',
          features: ['주문관리', '구독관리'],
        },
      };

      // 기본 설정 (타입 안전성을 위해)
      const defaultConfig = {
        url: '',
        ordersPath: '',
        supportEmail: '',
        features: [] as string[],
      };

      // 각 서비스에 대해 최근 이벤트 조회
      const serviceDetails = await Promise.all(
        approvedByService.map(async (svc) => {
          const config = serviceConfig[svc.serviceId] || defaultConfig;

          // 최근 승인/거절 이벤트 (최신 5건)
          const recentEvents = await this.requestEventRepo
            .createQueryBuilder('event')
            .where('event.actorId = :supplierId', { supplierId })
            .andWhere('event.serviceId = :serviceId', { serviceId: svc.serviceId })
            .orderBy('event.createdAt', 'DESC')
            .limit(5)
            .getMany();

          const pendingCount = await this.supplierRequestRepo.count({
            where: {
              supplierId,
              serviceId: svc.serviceId,
              status: SupplierRequestStatus.PENDING,
            },
          });

          return {
            serviceId: svc.serviceId,
            serviceName: svc.serviceName,
            summary: {
              approvedSellerCount: parseInt(svc.approvedCount, 10),
              pendingRequestCount: pendingCount,
              lastApprovedAt: svc.lastApprovedAt || null,
            },
            navigation: {
              serviceUrl: config.url || null,
              ordersUrl: config.url ? `${config.url}${config.ordersPath}` : null,
              supportEmail: config.supportEmail || null,
            },
            features: config.features || [],
            recentActivity: recentEvents.map((e) => ({
              eventType: e.eventType,
              sellerName: e.sellerName,
              productName: e.productName,
              createdAt: e.createdAt,
            })),
            notice: 'Neture에서는 주문을 직접 처리하지 않습니다. 해당 서비스에서 주문을 관리하세요.',
          };
        })
      );

      return {
        services: serviceDetails,
        totalApprovedSellers: serviceDetails.reduce((sum, s) => sum + s.summary.approvedSellerCount, 0),
        totalPendingRequests: serviceDetails.reduce((sum, s) => sum + s.summary.pendingRequestCount, 0),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching order summary:', error);
      throw error;
    }
  }

  // ==================== Supplier Contents (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.1) ====================

  /**
   * GET /supplier/contents - 공급자 콘텐츠 목록
   */
  async getSupplierContents(
    supplierId: string,
    filters?: { type?: ContentType; status?: ContentStatus }
  ) {
    try {
      const query = this.contentRepo
        .createQueryBuilder('content')
        .where('content.supplierId = :supplierId', { supplierId });

      if (filters?.type) {
        query.andWhere('content.type = :type', { type: filters.type });
      }

      if (filters?.status) {
        query.andWhere('content.status = :status', { status: filters.status });
      }

      query.orderBy('content.updatedAt', 'DESC');

      const contents = await query.getMany();

      return contents.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        description: c.description,
        status: c.status,
        availableServices: c.availableServices || [],
        availableAreas: c.availableAreas || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        publishedAt: c.publishedAt,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier contents:', error);
      throw error;
    }
  }

  /**
   * GET /supplier/contents/:id - 콘텐츠 상세 조회
   */
  async getSupplierContentById(id: string, supplierId: string) {
    try {
      const content = await this.contentRepo.findOne({
        where: { id, supplierId },
      });

      if (!content) {
        return null;
      }

      return {
        id: content.id,
        type: content.type,
        title: content.title,
        description: content.description,
        body: content.body,
        imageUrl: content.imageUrl,
        status: content.status,
        availableServices: content.availableServices || [],
        availableAreas: content.availableAreas || [],
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        publishedAt: content.publishedAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier content:', error);
      throw error;
    }
  }

  /**
   * POST /supplier/contents - 콘텐츠 생성
   */
  async createSupplierContent(
    supplierId: string,
    data: {
      type: ContentType;
      title: string;
      description?: string;
      body?: string;
      imageUrl?: string;
      availableServices?: string[];
      availableAreas?: string[];
    }
  ) {
    try {
      const content = this.contentRepo.create({
        supplierId,
        type: data.type,
        title: data.title,
        description: data.description || '',
        body: data.body || '',
        imageUrl: data.imageUrl || '',
        status: ContentStatus.DRAFT,
        availableServices: data.availableServices || [],
        availableAreas: data.availableAreas || [],
      });

      const savedContent = await this.contentRepo.save(content);

      logger.info(`[NetureService] Created content ${savedContent.id} for supplier ${supplierId}`);

      return {
        id: savedContent.id,
        type: savedContent.type,
        title: savedContent.title,
        status: savedContent.status,
        createdAt: savedContent.createdAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error creating supplier content:', error);
      throw error;
    }
  }

  /**
   * PATCH /supplier/contents/:id - 콘텐츠 수정
   */
  async updateSupplierContent(
    id: string,
    supplierId: string,
    updates: {
      title?: string;
      description?: string;
      body?: string;
      imageUrl?: string;
      status?: ContentStatus;
      availableServices?: string[];
      availableAreas?: string[];
    }
  ) {
    try {
      const content = await this.contentRepo.findOne({
        where: { id, supplierId },
      });

      if (!content) {
        return { success: false, error: 'CONTENT_NOT_FOUND' };
      }

      // 필드 업데이트
      if (updates.title !== undefined) content.title = updates.title;
      if (updates.description !== undefined) content.description = updates.description;
      if (updates.body !== undefined) content.body = updates.body;
      if (updates.imageUrl !== undefined) content.imageUrl = updates.imageUrl;
      if (updates.availableServices !== undefined) content.availableServices = updates.availableServices;
      if (updates.availableAreas !== undefined) content.availableAreas = updates.availableAreas;

      // 상태 전환 처리
      if (updates.status !== undefined) {
        const oldStatus = content.status;
        content.status = updates.status;

        // draft → published 전환 시 publishedAt 설정
        if (oldStatus === ContentStatus.DRAFT && updates.status === ContentStatus.PUBLISHED) {
          content.publishedAt = new Date();
        }
      }

      const savedContent = await this.contentRepo.save(content);

      logger.info(`[NetureService] Updated content ${id} by supplier ${supplierId}`);

      return {
        success: true,
        data: {
          id: savedContent.id,
          title: savedContent.title,
          status: savedContent.status,
          updatedAt: savedContent.updatedAt,
          publishedAt: savedContent.publishedAt,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error updating supplier content:', error);
      throw error;
    }
  }

  /**
   * DELETE /supplier/contents/:id - 콘텐츠 삭제
   */
  async deleteSupplierContent(id: string, supplierId: string) {
    try {
      const content = await this.contentRepo.findOne({
        where: { id, supplierId },
      });

      if (!content) {
        return { success: false, error: 'CONTENT_NOT_FOUND' };
      }

      await this.contentRepo.remove(content);

      logger.info(`[NetureService] Deleted content ${id} by supplier ${supplierId}`);

      return { success: true };
    } catch (error) {
      logger.error('[NetureService] Error deleting supplier content:', error);
      throw error;
    }
  }

  // ==================== Dashboard Summary API ====================

  /**
   * GET /supplier/dashboard/summary - 공급자 대시보드 통계 요약
   */
  async getSupplierDashboardSummary(supplierId: string) {
    try {
      // 요청 통계
      const totalRequests = await this.supplierRequestRepo.count({
        where: { supplierId },
      });

      const pendingRequests = await this.supplierRequestRepo.count({
        where: { supplierId, status: SupplierRequestStatus.PENDING },
      });

      const approvedRequests = await this.supplierRequestRepo.count({
        where: { supplierId, status: SupplierRequestStatus.APPROVED },
      });

      const rejectedRequests = await this.supplierRequestRepo.count({
        where: { supplierId, status: SupplierRequestStatus.REJECTED },
      });

      // 최근 7일 승인
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentApprovals = await this.supplierRequestRepo
        .createQueryBuilder('request')
        .where('request.supplierId = :supplierId', { supplierId })
        .andWhere('request.status = :status', { status: SupplierRequestStatus.APPROVED })
        .andWhere('request.decidedAt >= :sevenDaysAgo', { sevenDaysAgo })
        .getCount();

      // 제품 통계
      const products = await this.productRepo.find({
        where: { supplierId },
      });

      const activeProducts = products.filter((p) => p.isActive).length;
      const totalProducts = products.length;

      // 콘텐츠 통계
      const totalContents = await this.contentRepo.count({
        where: { supplierId },
      });

      const publishedContents = await this.contentRepo.count({
        where: { supplierId, status: ContentStatus.PUBLISHED },
      });

      // 연결된 서비스 수 (승인된 요청 기준)
      const connectedServices = await this.supplierRequestRepo
        .createQueryBuilder('request')
        .select('COUNT(DISTINCT request.serviceId)', 'count')
        .where('request.supplierId = :supplierId', { supplierId })
        .andWhere('request.status = :status', { status: SupplierRequestStatus.APPROVED })
        .getRawOne();

      // 서비스별 통계
      const serviceStats = await this.supplierRequestRepo
        .createQueryBuilder('request')
        .select('request.serviceId', 'serviceId')
        .addSelect('request.serviceName', 'serviceName')
        .addSelect('SUM(CASE WHEN request.status = :pending THEN 1 ELSE 0 END)', 'pending')
        .addSelect('SUM(CASE WHEN request.status = :approved THEN 1 ELSE 0 END)', 'approved')
        .addSelect('SUM(CASE WHEN request.status = :rejected THEN 1 ELSE 0 END)', 'rejected')
        .where('request.supplierId = :supplierId', { supplierId })
        .setParameter('pending', SupplierRequestStatus.PENDING)
        .setParameter('approved', SupplierRequestStatus.APPROVED)
        .setParameter('rejected', SupplierRequestStatus.REJECTED)
        .groupBy('request.serviceId')
        .addGroupBy('request.serviceName')
        .getRawMany();

      // 최근 활동 (이벤트)
      const recentEvents = await this.requestEventRepo
        .createQueryBuilder('event')
        .where('event.actorId = :supplierId', { supplierId })
        .orderBy('event.createdAt', 'DESC')
        .limit(10)
        .getMany();

      return {
        stats: {
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          recentApprovals,
          totalProducts,
          activeProducts,
          totalContents,
          publishedContents,
          connectedServices: parseInt(connectedServices?.count || '0', 10),
        },
        serviceStats: serviceStats.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          pending: parseInt(s.pending, 10),
          approved: parseInt(s.approved, 10),
          rejected: parseInt(s.rejected, 10),
        })),
        recentActivity: recentEvents.map((e) => ({
          id: e.id,
          type: e.eventType,
          sellerName: e.sellerName,
          productName: e.productName,
          serviceName: e.serviceName,
          timestamp: e.createdAt,
        })),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier dashboard summary:', error);
      throw error;
    }
  }

  /**
   * GET /admin/dashboard/summary - 운영자/관리자 대시보드 통계 요약
   */
  async getAdminDashboardSummary() {
    try {
      // 공급자 통계
      const totalSuppliers = await this.supplierRepo.count();
      const activeSuppliers = await this.supplierRepo.count({
        where: { status: SupplierStatus.ACTIVE },
      });

      // 요청 통계
      const totalRequests = await this.supplierRequestRepo.count();
      const pendingRequests = await this.supplierRequestRepo.count({
        where: { status: SupplierRequestStatus.PENDING },
      });
      const approvedRequests = await this.supplierRequestRepo.count({
        where: { status: SupplierRequestStatus.APPROVED },
      });
      const rejectedRequests = await this.supplierRequestRepo.count({
        where: { status: SupplierRequestStatus.REJECTED },
      });

      // 파트너십 요청 통계
      const totalPartnershipRequests = await this.partnershipRepo.count();
      const openPartnershipRequests = await this.partnershipRepo.count({
        where: { status: PartnershipStatus.OPEN },
      });

      // 콘텐츠 통계
      const totalContents = await this.contentRepo.count();
      const publishedContents = await this.contentRepo.count({
        where: { status: ContentStatus.PUBLISHED },
      });

      // 서비스별 공급자/파트너 통계
      const serviceStats = await this.supplierRequestRepo
        .createQueryBuilder('request')
        .select('request.serviceId', 'serviceId')
        .addSelect('request.serviceName', 'serviceName')
        .addSelect('COUNT(DISTINCT CASE WHEN request.status = :approved THEN request.supplierId END)', 'suppliers')
        .addSelect('COUNT(DISTINCT CASE WHEN request.status = :approved THEN request.sellerId END)', 'partners')
        .setParameter('approved', SupplierRequestStatus.APPROVED)
        .groupBy('request.serviceId')
        .addGroupBy('request.serviceName')
        .getRawMany();

      // 최근 요청 (대기 중)
      const recentPendingRequests = await this.supplierRequestRepo.find({
        where: { status: SupplierRequestStatus.PENDING },
        order: { createdAt: 'DESC' },
        take: 5,
      });

      // 최근 활동
      const recentEvents = await this.requestEventRepo.find({
        order: { createdAt: 'DESC' },
        take: 10,
      });

      return {
        stats: {
          totalSuppliers,
          activeSuppliers,
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          totalPartnershipRequests,
          openPartnershipRequests,
          totalContents,
          publishedContents,
        },
        serviceStatus: serviceStats.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          suppliers: parseInt(s.suppliers, 10),
          partners: parseInt(s.partners, 10),
          status: 'active',
        })),
        recentApplications: recentPendingRequests.map((r) => ({
          id: r.id,
          name: r.sellerName,
          type: '공급자 신청',
          date: r.createdAt,
          status: '대기중',
        })),
        recentActivities: recentEvents.map((e) => ({
          id: e.id,
          type: e.eventType,
          text: `${e.sellerName} - ${e.productName} (${e.serviceName})`,
          time: e.createdAt,
        })),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching admin dashboard summary:', error);
      throw error;
    }
  }

  /**
   * GET /partner/dashboard/summary - 파트너 대시보드 통계 요약
   */
  async getPartnerDashboardSummary(userId: string) {
    try {
      // 파트너십 요청 통계
      const partnershipRequests = await this.partnershipRepo.find({
        where: { sellerId: userId },
      });

      const totalRequests = partnershipRequests.length;
      const openRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.OPEN).length;
      const matchedRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.MATCHED).length;
      const closedRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.CLOSED).length;

      // 파트너 역할로 참여 중인 서비스 (공급자 요청에서 seller로 등록된 경우)
      const sellerRequests = await this.supplierRequestRepo.find({
        where: { sellerId: userId, status: SupplierRequestStatus.APPROVED },
      });

      // 연결된 서비스 (중복 제거)
      const connectedServicesMap = new Map<string, {
        serviceId: string;
        serviceName: string;
        supplierCount: number;
        lastActivity: Date;
      }>();

      sellerRequests.forEach((r) => {
        const existing = connectedServicesMap.get(r.serviceId);
        if (existing) {
          existing.supplierCount++;
          if (new Date(r.createdAt) > existing.lastActivity) {
            existing.lastActivity = new Date(r.createdAt);
          }
        } else {
          connectedServicesMap.set(r.serviceId, {
            serviceId: r.serviceId,
            serviceName: r.serviceName,
            supplierCount: 1,
            lastActivity: new Date(r.createdAt),
          });
        }
      });

      const connectedServices = Array.from(connectedServicesMap.values());

      // 알림 (최근 파트너십 요청 상태 변경, 정산 등)
      const notifications: Array<{ type: string; text: string; link: string }> = [];

      const recentMatchedRequests = partnershipRequests.filter(
        (r) => r.status === PartnershipStatus.MATCHED && r.matchedAt
      );
      if (recentMatchedRequests.length > 0) {
        notifications.push({
          type: 'success',
          text: `파트너십 매칭 완료 ${recentMatchedRequests.length}건`,
          link: '/partner/collaboration',
        });
      }

      if (openRequests > 0) {
        notifications.push({
          type: 'info',
          text: `진행 중인 파트너십 요청 ${openRequests}건`,
          link: '/partner/collaboration',
        });
      }

      return {
        stats: {
          totalRequests,
          openRequests,
          matchedRequests,
          closedRequests,
          connectedServiceCount: connectedServices.length,
          totalSupplierCount: sellerRequests.length,
        },
        connectedServices: connectedServices.map((s) => ({
          ...s,
          lastActivity: this.formatRelativeTime(s.lastActivity),
        })),
        notifications,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching partner dashboard summary:', error);
      throw error;
    }
  }

  /**
   * 상대적 시간 포맷팅
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }

  // ==================== Request Events (WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.2) ====================

  /**
   * GET /supplier/requests/:id/events - 신청에 대한 이벤트 로그 조회
   */
  async getRequestEvents(requestId: string, supplierId: string) {
    try {
      // 먼저 해당 신청이 이 공급자 소유인지 확인
      const request = await this.supplierRequestRepo.findOne({
        where: { id: requestId, supplierId },
      });

      if (!request) {
        return { success: false, error: 'REQUEST_NOT_FOUND' };
      }

      const events = await this.requestEventRepo.find({
        where: { requestId },
        order: { createdAt: 'DESC' },
      });

      return {
        success: true,
        data: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          actor: {
            id: e.actorId,
            name: e.actorName,
          },
          seller: {
            id: e.sellerId,
            name: e.sellerName,
          },
          product: {
            id: e.productId,
            name: e.productName,
          },
          service: {
            id: e.serviceId,
            name: e.serviceName,
          },
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          reason: e.reason,
          createdAt: e.createdAt,
        })),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching request events:', error);
      throw error;
    }
  }

  /**
   * GET /supplier/events - 공급자의 모든 이벤트 로그 조회
   *
   * 필터 옵션:
   * - eventType: 이벤트 유형 (approved, rejected)
   * - limit: 최대 개수
   */
  async getSupplierEvents(
    supplierId: string,
    filters?: { eventType?: RequestEventType; limit?: number }
  ) {
    try {
      const query = this.requestEventRepo
        .createQueryBuilder('event')
        .where('event.actorId = :supplierId', { supplierId });

      if (filters?.eventType) {
        query.andWhere('event.eventType = :eventType', { eventType: filters.eventType });
      }

      query.orderBy('event.createdAt', 'DESC');

      if (filters?.limit) {
        query.limit(filters.limit);
      }

      const events = await query.getMany();

      return events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        requestId: e.requestId,
        seller: {
          id: e.sellerId,
          name: e.sellerName,
        },
        product: {
          id: e.productId,
          name: e.productName,
        },
        service: {
          id: e.serviceId,
          name: e.serviceName,
        },
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        reason: e.reason,
        createdAt: e.createdAt,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier events:', error);
      throw error;
    }
  }

  // ==================== Operator Supply Dashboard (WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1) ====================

  /**
   * 운영자용 공급 가능 제품 목록 + 공급요청 상태 머지
   */
  async getOperatorSupplyProducts(operatorUserId: string) {
    try {
      // 1. 모든 활성 공급자 제품 조회
      const products = await this.productRepo.find({
        where: { isActive: true },
        relations: ['supplier'],
        order: { createdAt: 'DESC' },
      });

      // 2. 해당 운영자가 보낸 모든 공급요청 조회
      const myRequests = await this.supplierRequestRepo.find({
        where: { sellerId: operatorUserId },
      });

      // 3. productId → 가장 관련성 높은 요청 상태 매핑
      // 우선순위: pending/approved > rejected (같은 supplier+product)
      const requestMap = new Map<string, { status: string; requestId: string; rejectReason?: string }>();
      for (const req of myRequests) {
        const key = `${req.supplierId}:${req.productId}`;
        const existing = requestMap.get(key);
        if (!existing ||
            req.status === SupplierRequestStatus.PENDING ||
            req.status === SupplierRequestStatus.APPROVED) {
          requestMap.set(key, {
            status: req.status,
            requestId: req.id,
            rejectReason: req.rejectReason || undefined,
          });
        }
      }

      // 4. 머지하여 반환
      return products.map((product) => {
        const key = `${product.supplierId}:${product.id}`;
        const request = requestMap.get(key);
        return {
          id: product.id,
          name: product.name,
          category: product.category || '',
          description: product.description || '',
          supplierId: product.supplierId,
          supplierName: (product as any).supplier?.name || '',
          supplyStatus: request?.status || 'available',
          requestId: request?.requestId || null,
          rejectReason: request?.rejectReason || null,
        };
      });
    } catch (error) {
      logger.error('[NetureService] Error fetching operator supply products:', error);
      throw error;
    }
  }
}
