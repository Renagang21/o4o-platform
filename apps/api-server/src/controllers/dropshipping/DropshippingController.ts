import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Supplier, SupplierStatus, SupplierTier } from '../../entities/Supplier';
import { Partner, PartnerStatus, PartnerTier } from '../../entities/Partner';
import { PartnerCommission } from '../../entities/PartnerCommission';
import { Product } from '../../entities/Product';
import { ApprovalLog } from '../../entities/ApprovalLog';
import { User, UserRole, UserStatus } from '../../entities/User';

export class DropshippingController {
  
  // Commission Policies
  getCommissionPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
      const supplierRepo = getRepository(Supplier);
      
      // Get suppliers with their commission policies
      const suppliers = await supplierRepo.find({
        relations: ['user'],
        where: { isActive: true }
      });
      
      const policies = suppliers.map(supplier => ({
        id: supplier.id,
        title: `${supplier.user.fullName || supplier.user.email} 커미션 정책`,
        supplier: supplier.user.fullName || supplier.user.email,
        partnerGrades: ['bronze', 'silver', 'gold', 'platinum'],
        commissionRate: supplier.defaultPartnerCommissionRate,
        minOrderAmount: 0,
        startDate: supplier.createdAt.toISOString().split('T')[0],
        status: supplier.isActive ? 'active' : 'inactive',
        createdAt: supplier.createdAt.toISOString()
      }));

      res.json({
        success: true,
        policies
      });
    } catch (error) {
      console.error('Error fetching commission policies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commission policies'
      });
    }
  };

  // Approvals
  getApprovals = async (req: Request, res: Response): Promise<void> => {
    try {
      const approvalLogRepo = getRepository(ApprovalLog);
      
      const approvals = await approvalLogRepo.find({
        relations: ['user', 'admin'],
        order: { created_at: 'DESC' },
        take: 50
      });
      
      const mappedApprovals = approvals.map(log => ({
        id: log.id,
        title: log.metadata?.title || 'Approval Request',
        type: log.metadata?.type || 'general',
        status: log.action === 'pending' ? 'pending' : log.action,
        requestedBy: log.user?.fullName || log.user?.email || 'Unknown',
        requestedAt: log.created_at.toISOString(),
        reviewedBy: log.admin?.fullName || log.admin?.email,
        reviewedAt: log.updated_at?.toISOString(),
        details: log.metadata || {}
      }));

      res.json({
        success: true,
        approvals: mappedApprovals
      });
    } catch (error) {
      console.error('Error fetching approvals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch approvals'
      });
    }
  };

  approveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Admin authentication required'
        });
        return;
      }

      const approvalLogRepo = getRepository(ApprovalLog);
      
      const approval = await approvalLogRepo.findOne({
        where: { id },
        relations: ['user']
      });

      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Approval request not found'
        });
        return;
      }

      approval.action = 'approved';
      approval.admin_id = adminId;
      approval.updated_at = new Date();
      
      await approvalLogRepo.save(approval);

      res.json({
        success: true,
        message: 'Request approved successfully'
      });
    } catch (error) {
      console.error('Error approving request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve request'
      });
    }
  };

  rejectRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Admin authentication required'
        });
        return;
      }

      const approvalLogRepo = getRepository(ApprovalLog);
      
      const approval = await approvalLogRepo.findOne({
        where: { id },
        relations: ['user']
      });

      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Approval request not found'
        });
        return;
      }

      approval.action = 'rejected';
      approval.admin_id = adminId;
      approval.notes = reason || approval.notes;
      approval.updated_at = new Date();
      
      await approvalLogRepo.save(approval);

      res.json({
        success: true,
        message: 'Request rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject request'
      });
    }
  };

  // System Status
  getSystemStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const supplierRepo = getRepository(Supplier);
      const partnerRepo = getRepository(Partner);
      const productRepo = getRepository(Product);
      const commissionRepo = getRepository(PartnerCommission);

      const [suppliersCount, partnersCount, productsCount, commissionsCount] = await Promise.all([
        supplierRepo.count(),
        partnerRepo.count(),
        productRepo.count(),
        commissionRepo.count()
      ]);

      const status = {
        cpts: {
          ds_supplier: 'installed',
          ds_partner: 'installed', 
          ds_product: 'installed',
          ds_commission_policy: 'installed'
        },
        records: {
          suppliers: suppliersCount,
          partners: partnersCount,
          products: productsCount,
          commissions: commissionsCount
        },
        fieldGroups: 4, // Number of CPT field groups
        systemReady: true
      };

      res.json(status);
    } catch (error) {
      console.error('Error fetching system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system status'
      });
    }
  };

  // Initialize System
  initializeSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      // System is already initialized with TypeORM entities
      // This endpoint can be used for additional setup if needed
      
      res.json({
        success: true,
        message: 'Dropshipping system is already initialized',
        data: {
          entities: ['Supplier', 'Partner', 'PartnerCommission', 'Product'],
          initialized: true
        }
      });
    } catch (error) {
      console.error('Error initializing system:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize system'
      });
    }
  };

  // Create Sample Data
  createSampleData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRepo = getRepository(User);
      const supplierRepo = getRepository(Supplier);
      const partnerRepo = getRepository(Partner);

      // Create sample suppliers
      const sampleSuppliers = [];
      for (let i = 1; i <= 3; i++) {
        const user = userRepo.create({
          email: `supplier${i}@example.com`,
          password: 'password123',
          firstName: `Supplier`,
          lastName: `${i}`,
          role: UserRole.SUPPLIER,
          status: UserStatus.APPROVED,
          isActive: true
        });
        await userRepo.save(user);

        const supplier = supplierRepo.create({
          userId: user.id,
          status: SupplierStatus.APPROVED,
          tier: SupplierTier.BASIC,
          companyDescription: `Sample supplier company ${i}`,
          defaultPartnerCommissionRate: 5 + i,
          isActive: true
        });
        await supplierRepo.save(supplier);
        sampleSuppliers.push(supplier);
      }

      // Create sample partners
      const samplePartners = [];
      for (let i = 1; i <= 5; i++) {
        const user = userRepo.create({
          email: `partner${i}@example.com`,
          password: 'password123',
          firstName: `Partner`,
          lastName: `${i}`,
          role: UserRole.PARTNER,
          status: UserStatus.APPROVED,
          isActive: true
        });
        await userRepo.save(user);

        const partner = partnerRepo.create({
          userId: user.id,
          sellerId: sampleSuppliers[0].id, // Link to first supplier as seller
          status: PartnerStatus.ACTIVE,
          tier: i <= 2 ? PartnerTier.BRONZE : i <= 4 ? PartnerTier.SILVER : PartnerTier.GOLD,
          referralCode: `REF${i.toString().padStart(3, '0')}`,
          referralLink: `https://example.com?ref=REF${i.toString().padStart(3, '0')}`,
          isActive: true
        });
        await partnerRepo.save(partner);
        samplePartners.push(partner);
      }

      res.json({
        success: true,
        message: 'Sample data created successfully',
        suppliers: sampleSuppliers.length,
        partners: samplePartners.length,
        products: 0 // Products would be created separately
      });
    } catch (error) {
      console.error('Error creating sample data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create sample data'
      });
    }
  };

  // Bulk Import Products from CSV
  bulkImportProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const products = req.body;

      if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body. Expected an array of products.'
        });
        return;
      }

      const productRepo = getRepository(Product);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < products.length; i++) {
        try {
          const productData = products[i];

          // Validate required fields
          if (!productData.title || !productData.acf?.cost_price || !productData.acf?.selling_price || !productData.acf?.supplier) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: Missing required fields (title, cost_price, selling_price, supplier)`);
            continue;
          }

          // Create slug from title
          const slug = productData.title
            .toLowerCase()
            .replace(/[^a-z0-9가-힣\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim() + `-${Date.now()}-${i}`;

          // Create new product using proper Product entity structure
          const product = productRepo.create({
            name: productData.title,
            description: productData.content || '',
            sku: productData.acf.supplier_sku || `AUTO-${Date.now()}-${i}`,
            slug: slug,
            type: 'physical',
            status: 'draft', // Start as draft for review
            isActive: false,
            supplierPrice: parseFloat(productData.acf.cost_price),
            recommendedPrice: parseFloat(productData.acf.selling_price),
            currency: 'KRW',
            inventory: 0,
            trackInventory: true,
            allowBackorder: false,
            hasVariants: false,
            partnerCommissionRate: 0,
            supplierId: productData.acf.supplier // Now guaranteed to exist by validation
          });

          await productRepo.save(product);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        }
      }

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error bulk importing products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk import products'
      });
    }
  };
}