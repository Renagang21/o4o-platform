import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import {
  NetureSupplier,
  NetureSupplierProduct,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
  NetureSupplierRequest,
  SupplierStatus,
  PartnershipStatus,
  SupplierRequestStatus,
} from './entities/index.js';
import logger from '../../utils/logger.js';

export class NetureService {
  private supplierRepo: Repository<NetureSupplier>;
  private productRepo: Repository<NetureSupplierProduct>;
  private partnershipRepo: Repository<NeturePartnershipRequest>;
  private partnershipProductRepo: Repository<NeturePartnershipProduct>;
  private supplierRequestRepo: Repository<NetureSupplierRequest>;

  constructor() {
    this.supplierRepo = AppDataSource.getRepository(NetureSupplier);
    this.productRepo = AppDataSource.getRepository(NetureSupplierProduct);
    this.partnershipRepo = AppDataSource.getRepository(NeturePartnershipRequest);
    this.partnershipProductRepo = AppDataSource.getRepository(NeturePartnershipProduct);
    this.supplierRequestRepo = AppDataSource.getRepository(NetureSupplierRequest);
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
   */
  async approveSupplierRequest(id: string, supplierId: string) {
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

      // 승인 처리
      request.status = SupplierRequestStatus.APPROVED;
      request.decidedBy = supplierId;
      request.decidedAt = new Date();

      const updatedRequest = await this.supplierRequestRepo.save(request);

      logger.info(`[NetureService] Approved supplier request ${id} by ${supplierId}`);

      return {
        success: true,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          decidedBy: updatedRequest.decidedBy,
          decidedAt: updatedRequest.decidedAt,
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
   */
  async rejectSupplierRequest(id: string, supplierId: string, reason?: string) {
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

      // 거절 처리
      request.status = SupplierRequestStatus.REJECTED;
      request.decidedBy = supplierId;
      request.decidedAt = new Date();
      request.rejectReason = reason || '';

      const updatedRequest = await this.supplierRequestRepo.save(request);

      logger.info(`[NetureService] Rejected supplier request ${id} by ${supplierId}`);

      return {
        success: true,
        data: {
          id: updatedRequest.id,
          status: updatedRequest.status,
          decidedBy: updatedRequest.decidedBy,
          decidedAt: updatedRequest.decidedAt,
          rejectReason: updatedRequest.rejectReason,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error rejecting supplier request:', error);
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
}
