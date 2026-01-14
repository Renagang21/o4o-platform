import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import {
  NetureSupplier,
  NetureSupplierProduct,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
  SupplierStatus,
  PartnershipStatus,
} from './entities/index.js';
import logger from '../../utils/logger.js';

export class NetureService {
  private supplierRepo: Repository<NetureSupplier>;
  private productRepo: Repository<NetureSupplierProduct>;
  private partnershipRepo: Repository<NeturePartnershipRequest>;
  private partnershipProductRepo: Repository<NeturePartnershipProduct>;

  constructor() {
    this.supplierRepo = AppDataSource.getRepository(NetureSupplier);
    this.productRepo = AppDataSource.getRepository(NetureSupplierProduct);
    this.partnershipRepo = AppDataSource.getRepository(NeturePartnershipRequest);
    this.partnershipProductRepo = AppDataSource.getRepository(NeturePartnershipProduct);
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
}
