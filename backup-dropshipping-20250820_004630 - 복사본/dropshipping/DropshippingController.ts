import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { User, UserRole } from '../../entities/User';
import { Supplier } from '../../entities/dropshipping/Supplier';
import { Seller } from '../../entities/dropshipping/Seller';
import { Affiliate } from '../../entities/dropshipping/Affiliate';
import { DropshippingProduct } from '../../entities/dropshipping/DropshippingProduct';
import { SupplierStatus, SellerLevel, AffiliateStatus } from '../../types/dropshipping';

export class DropshippingController {
  // Dashboard endpoints
  static async getDashboard(req: Request, res: Response) {
    try {
      const { role } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      let dashboardData = {};

      switch (role) {
        case UserRole.SUPPLIER:
          dashboardData = await DropshippingController.getSupplierDashboard(userId);
          break;
        case UserRole.SELLER:
          dashboardData = await DropshippingController.getSellerDashboard(userId);
          break;
        case UserRole.AFFILIATE:
          dashboardData = await DropshippingController.getAffiliateDashboard(userId);
          break;
        default:
          return res.status(400).json({ success: false, message: 'Invalid role' });
      }

      return res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error('Dashboard error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  private static async getSupplierDashboard(userId: string) {
    const supplierRepo = AppDataSource.getRepository(Supplier);
    const productRepo = AppDataSource.getRepository(DropshippingProduct);

    const supplier = await supplierRepo.findOne({ where: { userId } });
    
    if (!supplier) {
      return { error: 'Supplier profile not found' };
    }

    const products = await productRepo.find({ where: { supplierId: supplier.id } });
    const activeProducts = products.filter(p => p.isActive);
    const lowStockProducts = products.filter(p => p.isLowStock());

    // Mock data for demonstration - replace with actual queries
    const recentOrders = [];
    const pendingOrders = 0;
    const revenueGrowth = 12.5;

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      totalOrders: supplier.totalOrders,
      pendingOrders,
      totalRevenue: supplier.totalRevenue,
      revenueGrowth,
      averageRating: supplier.averageRating,
      totalReviews: supplier.totalReviews,
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.availableQuantity
      })),
      recentOrders
    };
  }

  private static async getSellerDashboard(userId: string) {
    const sellerRepo = AppDataSource.getRepository(Seller);
    
    const seller = await sellerRepo.findOne({ where: { userId } });
    
    if (!seller) {
      return { error: 'Seller profile not found' };
    }

    // Mock data for demonstration - replace with actual queries
    const activeListings = 0;
    const totalSuppliers = 0;
    const processingOrders = 0;
    const salesGrowth = 15.3;
    const topProducts = [];
    const pendingActions = [];

    return {
      totalSales: seller.totalSales,
      salesGrowth,
      activeListings,
      totalSuppliers,
      totalOrders: seller.totalOrders,
      processingOrders,
      satisfaction: seller.customerSatisfaction * 20, // Convert to percentage
      returnRate: seller.returnRate,
      topProducts,
      pendingActions
    };
  }

  private static async getAffiliateDashboard(userId: string) {
    const affiliateRepo = AppDataSource.getRepository(Affiliate);
    
    const affiliate = await affiliateRepo.findOne({ where: { userId } });
    
    if (!affiliate) {
      return { error: 'Affiliate profile not found' };
    }

    // Mock data for demonstration - replace with actual queries
    const recentConversions = [];
    const tier = affiliate.totalEarnings > 10000 ? 'Gold' : 
                 affiliate.totalEarnings > 5000 ? 'Silver' : 'Bronze';

    return {
      referralCode: affiliate.referralCode,
      totalClicks: affiliate.totalClicks,
      uniqueClicks: affiliate.uniqueClicks,
      conversions: affiliate.totalConversions,
      conversionRate: affiliate.conversionRate,
      totalEarnings: affiliate.totalEarnings,
      pendingEarnings: affiliate.pendingEarnings,
      commissionRate: affiliate.baseCommissionRate,
      tier,
      avgOrderValue: affiliate.averageOrderValue,
      repeatCustomers: affiliate.repeatCustomers,
      monthlyEarnings: affiliate.currentMonthEarnings,
      nextPayoutDate: affiliate.nextPayoutDate,
      recentConversions
    };
  }

  // Verification endpoints
  static async getVerificationStatus(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      let status = 'not_started';
      let formData = {};

      switch (type) {
        case 'supplier':
          const supplierRepo = AppDataSource.getRepository(Supplier);
          const supplier = await supplierRepo.findOne({ where: { userId } });
          if (supplier) {
            status = supplier.verificationStatus;
            formData = {
              companyName: supplier.companyName,
              businessNumber: supplier.businessNumber,
              contactPerson: supplier.contactPerson,
              contactEmail: supplier.contactEmail,
              contactPhone: supplier.contactPhone,
              address: supplier.address
            };
          }
          break;

        case 'seller':
          const sellerRepo = AppDataSource.getRepository(Seller);
          const seller = await sellerRepo.findOne({ where: { userId } });
          if (seller) {
            status = seller.isVerified ? 'verified' : 'pending';
            formData = {
              storeName: seller.storeName,
              storeUrl: seller.storeUrl,
              description: seller.description,
              contactEmail: seller.contactEmail,
              contactPhone: seller.contactPhone,
              marketplaces: seller.marketplaces
            };
          }
          break;

        case 'affiliate':
          const affiliateRepo = AppDataSource.getRepository(Affiliate);
          const affiliate = await affiliateRepo.findOne({ where: { userId } });
          if (affiliate) {
            status = affiliate.isVerified ? 'verified' : 'pending';
            formData = {
              websiteUrl: affiliate.websiteUrl,
              description: affiliate.description,
              socialMedia: affiliate.socialMedia,
              audienceInfo: affiliate.audienceInfo,
              taxId: affiliate.taxId
            };
          }
          break;
      }

      return res.json({ success: true, status, formData });
    } catch (error) {
      console.error('Verification status error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async submitVerification(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const userId = (req as any).user?.id;
      const data = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      switch (type) {
        case 'supplier':
          await DropshippingController.createOrUpdateSupplier(userId, data);
          // Add supplier role to user
          if (!user.roles.includes(UserRole.SUPPLIER)) {
            user.roles.push(UserRole.SUPPLIER);
            await userRepo.save(user);
          }
          break;

        case 'seller':
          await DropshippingController.createOrUpdateSeller(userId, data);
          // Add seller role to user
          if (!user.roles.includes(UserRole.SELLER)) {
            user.roles.push(UserRole.SELLER);
            await userRepo.save(user);
          }
          break;

        case 'affiliate':
          await DropshippingController.createOrUpdateAffiliate(userId, data);
          // Add affiliate role to user
          if (!user.roles.includes(UserRole.AFFILIATE)) {
            user.roles.push(UserRole.AFFILIATE);
            await userRepo.save(user);
          }
          break;

        default:
          return res.status(400).json({ success: false, message: 'Invalid verification type' });
      }

      return res.json({ success: true, message: 'Verification submitted successfully' });
    } catch (error) {
      console.error('Verification submission error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  private static async createOrUpdateSupplier(userId: string, data: any) {
    const supplierRepo = AppDataSource.getRepository(Supplier);
    
    let supplier = await supplierRepo.findOne({ where: { userId } });
    
    if (!supplier) {
      supplier = supplierRepo.create({
        userId,
        verificationStatus: SupplierStatus.PENDING
      });
    }

    // Update supplier data
    supplier.companyName = data.companyName;
    supplier.businessNumber = data.businessNumber;
    supplier.businessLicense = data.documents?.businessLicense;
    supplier.onlineSellingLicense = data.documents?.onlineSellingLicense;
    supplier.contactPerson = data.contactPerson;
    supplier.contactEmail = data.contactEmail;
    supplier.contactPhone = data.contactPhone;
    supplier.address = data.address;
    
    if (data.bankName && data.accountNumber) {
      supplier.bankAccount = {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolder: data.accountHolder
      };
    }

    await supplierRepo.save(supplier);
  }

  private static async createOrUpdateSeller(userId: string, data: any) {
    const sellerRepo = AppDataSource.getRepository(Seller);
    
    let seller = await sellerRepo.findOne({ where: { userId } });
    
    if (!seller) {
      seller = sellerRepo.create({
        userId,
        sellerLevel: SellerLevel.BRONZE
      });
    }

    // Update seller data
    seller.storeName = data.storeName;
    seller.storeUrl = data.storeUrl;
    seller.description = data.description;
    seller.contactEmail = data.contactEmail;
    seller.contactPhone = data.contactPhone;
    seller.marketplaces = data.marketplaces;

    await sellerRepo.save(seller);
  }

  private static async createOrUpdateAffiliate(userId: string, data: any) {
    const affiliateRepo = AppDataSource.getRepository(Affiliate);
    
    let affiliate = await affiliateRepo.findOne({ where: { userId } });
    
    if (!affiliate) {
      affiliate = affiliateRepo.create({
        userId,
        status: AffiliateStatus.ACTIVE,
        baseCommissionRate: 5.00 // Default 5% commission
      });
    }

    // Update affiliate data
    affiliate.websiteUrl = data.websiteUrl;
    affiliate.description = data.promotionMethods;
    affiliate.socialMedia = data.socialMedia;
    affiliate.audienceInfo = {
      size: data.audienceSize,
      primaryPlatform: data.primaryPlatform
    };
    affiliate.taxId = data.taxId;

    await affiliateRepo.save(affiliate);
  }

  // Document upload endpoint
  static async uploadDocument(req: Request, res: Response) {
    try {
      // Handle file upload logic here
      // For now, return a mock response
      const fileUrl = `/uploads/documents/${Date.now()}-${req.file?.originalname}`;
      
      return res.json({ 
        success: true, 
        url: fileUrl,
        message: 'Document uploaded successfully' 
      });
    } catch (error) {
      console.error('Document upload error:', error);
      return res.status(500).json({ success: false, message: 'Upload failed' });
    }
  }
}