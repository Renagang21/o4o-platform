import { Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../../entities/User.js';
import { AuthRequest } from '../../types/auth.js';
import { v4 as uuidv4 } from 'uuid';

// Types for Phase K Partner API
interface PartnerData {
  id: string;
  userId: string;
  name: string;
  level: 'newbie' | 'standard' | 'pro' | 'elite';
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  commissionRate: number;
  profileImage?: string;
  socialLinks?: Record<string, string>;
  clickCount: number;
  conversionCount: number;
  totalCommission: number;
  createdAt: string;
}

interface PartnerLinkData {
  id: string;
  partnerId: string;
  code: string;
  targetType: string;
  targetId?: string;
  clickCount: number;
  conversionCount: number;
  createdAt: string;
}

// In-memory store for Phase K MVP (will be replaced with actual DB)
const partnersStore: Map<string, PartnerData> = new Map();
const partnerLinksStore: Map<string, PartnerLinkData[]> = new Map();

export class PartnerController {
  // ====================================
  // Phase K: Consumer-facing Partner API
  // ====================================

  // Partner signup
  static async signup(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { name, socialLinks } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Partner name is required'
        });
      }

      // Check if already a partner
      if (partnersStore.has(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Already registered as partner'
        });
      }

      // Create new partner
      const partnerId = uuidv4();
      const partnerCode = `P${Date.now().toString(36).toUpperCase()}`;

      const newPartner: PartnerData = {
        id: partnerId,
        userId,
        name: name.trim(),
        level: 'newbie',
        status: 'active', // Auto-approve for MVP
        commissionRate: 5.0,
        socialLinks: socialLinks || {},
        clickCount: 0,
        conversionCount: 0,
        totalCommission: 0,
        createdAt: new Date().toISOString()
      };

      partnersStore.set(userId, newPartner);
      partnerLinksStore.set(partnerId, []);

      res.status(201).json({
        success: true,
        data: newPartner
      });
    } catch (error) {
      console.error('Partner signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register as partner'
      });
    }
  }

  // Get current partner info
  static async getMe(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const partner = partnersStore.get(userId);

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Not a partner'
        });
      }

      res.json({
        success: true,
        data: partner
      });
    } catch (error) {
      console.error('Get partner error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get partner info'
      });
    }
  }

  // Get partner dashboard summary
  static async getPartnerDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const partner = partnersStore.get(userId);

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Not a partner'
        });
      }

      const conversionRate =
        partner.clickCount > 0
          ? (partner.conversionCount / partner.clickCount) * 100
          : 0;

      res.json({
        success: true,
        data: {
          totalClicks: partner.clickCount,
          totalConversions: partner.conversionCount,
          totalEarnings: partner.totalCommission,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          pendingEarnings: 0 // TODO: Calculate from pending conversions
        }
      });
    } catch (error) {
      console.error('Get partner dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard'
      });
    }
  }

  // Get partner links
  static async getLinks(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const partner = partnersStore.get(userId);

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Not a partner'
        });
      }

      const links = partnerLinksStore.get(partner.id) || [];

      res.json({
        success: true,
        data: links
      });
    } catch (error) {
      console.error('Get partner links error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get links'
      });
    }
  }

  // Create partner link
  static async createLink(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { targetType, targetId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const partner = partnersStore.get(userId);

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Not a partner'
        });
      }

      const linkCode = `${partner.id.substring(0, 8)}_${Date.now().toString(36)}`.toUpperCase();

      const newLink: PartnerLinkData = {
        id: uuidv4(),
        partnerId: partner.id,
        code: linkCode,
        targetType: targetType || 'general',
        targetId: targetId || undefined,
        clickCount: 0,
        conversionCount: 0,
        createdAt: new Date().toISOString()
      };

      const links = partnerLinksStore.get(partner.id) || [];
      links.unshift(newLink);
      partnerLinksStore.set(partner.id, links);

      res.status(201).json({
        success: true,
        data: newLink
      });
    } catch (error) {
      console.error('Create partner link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create link'
      });
    }
  }

  // Get partner earnings
  static async getEarnings(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const partner = partnersStore.get(userId);

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Not a partner'
        });
      }

      // Return empty for MVP (TODO: Implement actual earnings from conversions)
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error('Get partner earnings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get earnings'
      });
    }
  }

  // ====================================
  // Legacy API (existing)
  // ====================================

  // Get partner dashboard summary
  static async getDashboardSummary(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Fetch partner data from database
      const userRepository = getRepository(User);
      const partner = await userRepository.findOne({ 
        where: { id: userId }
      });

      if (!partner || partner.role !== 'partner') {
        return res.status(403).json({ 
          success: false, 
          message: 'Partner access only' 
        });
      }

      // Mock metrics data - Replace with actual database queries when Order entity is available
      const totalEarnings = 12345.67;
      const monthlyEarnings = 2345.89;
      const pendingCommissions = 456.78;
      const totalClicks = 2456;
      const totalConversions = 89;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Calculate tier progress
      const tierThresholds = {
        bronze: 0,
        silver: 5000,
        gold: 15000,
        platinum: 50000,
        diamond: 100000
      };

      let tierLevel = 'Bronze';
      let nextTierThreshold = tierThresholds.silver;
      
      if (totalEarnings >= tierThresholds.diamond) {
        tierLevel = 'Diamond';
        nextTierThreshold = totalEarnings; // Max tier reached
      } else if (totalEarnings >= tierThresholds.platinum) {
        tierLevel = 'Platinum';
        nextTierThreshold = tierThresholds.diamond;
      } else if (totalEarnings >= tierThresholds.gold) {
        tierLevel = 'Gold';
        nextTierThreshold = tierThresholds.platinum;
      } else if (totalEarnings >= tierThresholds.silver) {
        tierLevel = 'Silver';
        nextTierThreshold = tierThresholds.gold;
      }

      const tierProgress = Math.min(
        100,
        (totalEarnings / nextTierThreshold) * 100
      );

      // Generate summary
      const summary = {
        totalEarnings,
        monthlyEarnings,
        pendingCommissions,
        conversionRate,
        totalClicks,
        totalConversions,
        activeLinks: 12, // Mock data - replace with actual link count
        tierLevel,
        tierProgress,
        referralCode: `PARTNER${userId}`,
        joinDate: partner.createdAt?.toISOString() || new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      res.json({
        success: true,
        summary
      });

    } catch (error) {
      console.error('Partner dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard summary'
      });
    }
  }

  // Get partner commission history
  static async getCommissionHistory(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { period = '30d', status = 'all', page = 1, limit = 20 } = req.query;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Mock commission data - Replace with actual database queries when Order entity is available
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      
      const mockCommissions = [
        {
          id: '1',
          orderId: 'ORD-2024-001',
          productName: 'Premium Widget Pro',
          orderAmount: 299.99,
          commissionAmount: 45.00,
          commissionRate: 15,
          status: 'paid',
          createdAt: new Date('2024-01-15'),
          paidAt: new Date('2024-01-20')
        },
        {
          id: '2',
          orderId: 'ORD-2024-002',
          productName: 'Deluxe Bundle',
          orderAmount: 599.99,
          commissionAmount: 72.00,
          commissionRate: 12,
          status: 'pending',
          createdAt: new Date('2024-01-18'),
          paidAt: null
        },
        {
          id: '3',
          orderId: 'ORD-2024-003',
          productName: 'Standard Package',
          orderAmount: 149.99,
          commissionAmount: 15.00,
          commissionRate: 10,
          status: 'approved',
          createdAt: new Date('2024-01-20'),
          paidAt: null
        }
      ];
      
      const total = mockCommissions.length;
      const transformedCommissions = mockCommissions.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      res.json({
        success: true,
        commissions: transformedCommissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Commission history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission history'
      });
    }
  }

  // Get partner performance analytics
  static async getPerformanceAnalytics(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { period = '30d' } = req.query;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Mock analytics data - replace with actual calculations
      const analytics = {
        period,
        metrics: {
          clicks: {
            total: 2456,
            trend: 12.5,
            data: [120, 150, 180, 200, 220, 195, 210] // Last 7 data points
          },
          conversions: {
            total: 89,
            trend: 8.2,
            data: [8, 12, 15, 10, 13, 11, 20]
          },
          earnings: {
            total: 3456.78,
            trend: 15.3,
            data: [280, 350, 420, 380, 450, 510, 566.78]
          },
          conversionRate: {
            value: 3.62,
            trend: -1.2,
            data: [3.2, 3.5, 3.8, 3.3, 3.6, 3.4, 3.9]
          }
        },
        topProducts: [
          {
            id: '1',
            name: 'Premium Widget',
            clicks: 450,
            conversions: 23,
            earnings: 689.50
          },
          {
            id: '2',
            name: 'Deluxe Package',
            clicks: 380,
            conversions: 18,
            earnings: 540.00
          },
          {
            id: '3',
            name: 'Standard Bundle',
            clicks: 320,
            conversions: 15,
            earnings: 375.00
          }
        ],
        trafficSources: [
          { source: 'Social Media', percentage: 45 },
          { source: 'Email', percentage: 25 },
          { source: 'Blog', percentage: 20 },
          { source: 'Direct', percentage: 10 }
        ]
      };

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      console.error('Performance analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch performance analytics'
      });
    }
  }

  // Generate partner link
  static async generatePartnerLink(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { productId, customCode, utmParams } = req.body;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Get partner's referral code
      const userRepository = getRepository(User);
      const partner = await userRepository.findOne({ 
        where: { id: userId }
      });

      if (!partner || partner.role !== 'partner') {
        return res.status(403).json({ 
          success: false, 
          message: 'Partner access only' 
        });
      }

      const referralCode = `PARTNER${userId}`;
      
      // Generate the partner link
      const baseUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
      const productPath = productId ? `/products/${productId}` : '';
      const queryParams = new URLSearchParams({
        ref: customCode || referralCode,
        ...utmParams
      });

      const partnerLink = {
        id: `link_${Date.now()}`,
        url: `${baseUrl}${productPath}?${queryParams.toString()}`,
        shortUrl: `${baseUrl}/r/${customCode || referralCode}${productId ? `/${productId}` : ''}`,
        productId,
        customCode: customCode || null,
        referralCode,
        createdAt: new Date().toISOString(),
        clicks: 0,
        conversions: 0
      };

      res.json({
        success: true,
        link: partnerLink
      });

    } catch (error) {
      console.error('Generate partner link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate partner link'
      });
    }
  }

  // Get partner products for promotion
  static async getPromotionalProducts(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { 
        category, 
        featured = false, 
        sortBy = 'commission', 
        page = 1, 
        limit = 12 
      } = req.query;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      // Mock product data - replace with actual database query
      const products = [
        {
          id: '1',
          name: 'Premium Widget Pro',
          description: 'High-performance widget with advanced features',
          price: 299.99,
          msrp: 399.99,
          commission: {
            rate: 15,
            amount: 45.00
          },
          category: 'Electronics',
          featured: true,
          images: ['/placeholder.jpg'],
          performance: {
            views: 1250,
            clicks: 89,
            conversions: 12,
            conversionRate: 13.48
          }
        },
        {
          id: '2',
          name: 'Deluxe Bundle Package',
          description: 'Complete solution bundle for professionals',
          price: 599.99,
          msrp: 799.99,
          commission: {
            rate: 12,
            amount: 72.00
          },
          category: 'Software',
          featured: true,
          images: ['/placeholder.jpg'],
          performance: {
            views: 980,
            clicks: 67,
            conversions: 8,
            conversionRate: 11.94
          }
        },
        {
          id: '3',
          name: 'Standard Starter Kit',
          description: 'Essential kit for beginners',
          price: 149.99,
          msrp: 199.99,
          commission: {
            rate: 10,
            amount: 15.00
          },
          category: 'Tools',
          featured: false,
          images: ['/placeholder.jpg'],
          performance: {
            views: 2100,
            clicks: 156,
            conversions: 23,
            conversionRate: 14.74
          }
        }
      ];

      // Apply filters
      let filteredProducts = [...products];
      
      if (category) {
        filteredProducts = filteredProducts.filter(p => 
          p.category.toLowerCase() === (category as string).toLowerCase()
        );
      }

      if (featured === 'true') {
        filteredProducts = filteredProducts.filter(p => p.featured);
      }

      // Apply sorting
      const sortFunctions: Record<string, (a: any, b: any) => number> = {
        commission: (a, b) => b.commission.amount - a.commission.amount,
        performance: (a, b) => b.performance.conversionRate - a.performance.conversionRate,
        price: (a, b) => a.price - b.price,
        newest: (a, b) => 0 // Mock - would use createdAt in real implementation
      };

      const sortFunction = sortFunctions[sortBy as string] || sortFunctions.commission;
      filteredProducts.sort(sortFunction);

      // Apply pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 12;
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      
      const paginatedProducts = filteredProducts.slice(start, end);

      res.json({
        success: true,
        products: paginatedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredProducts.length,
          pages: Math.ceil(filteredProducts.length / limitNum)
        }
      });

    } catch (error) {
      console.error('Get promotional products error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch promotional products'
      });
    }
  }
}