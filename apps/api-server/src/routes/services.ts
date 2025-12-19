import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthRequest } from '../types/auth.js';

const router: Router = Router();

// 모든 서비스 라우트는 인증 필요
router.use(authenticate);

// AI 서비스 접근
router.get('/ai', (req: AuthRequest, res) => {
  res.json({
    message: 'AI Services Access',
    services: [
      {
        name: 'Product Recommendation',
        endpoint: '/api/services/ai/recommendations',
        status: 'active'
      },
      {
        name: 'Inventory Analytics',
        endpoint: '/api/services/ai/analytics',
        status: 'active'
      },
      {
        name: 'Customer Insights',
        endpoint: '/api/services/ai/insights',
        status: 'coming_soon'
      }
    ],
    userAccess: {
      userId: req.user?.id,
      businessType: req.user?.businessInfo?.businessType,
      allowedServices: ['recommendations', 'analytics']
    }
  });
});

// RPA 서비스 접근
router.get('/rpa', (req: AuthRequest, res) => {
  res.json({
    message: 'RPA Services Access',
    services: [
      {
        name: 'Order Automation',
        endpoint: '/api/services/rpa/orders',
        status: 'active'
      },
      {
        name: 'Inventory Sync',
        endpoint: '/api/services/rpa/inventory',
        status: 'active'
      },
      {
        name: 'Price Monitoring',
        endpoint: '/api/services/rpa/pricing',
        status: 'beta'
      }
    ],
    userAccess: {
      userId: req.user?.id,
      businessType: req.user?.businessInfo?.businessType,
      allowedServices: ['orders', 'inventory']
    }
  });
});

// 전자상거래 서비스 접근
router.get('/ecommerce', (req: AuthRequest, res) => {
  res.json({
    message: 'E-commerce Services Access',
    services: [
      {
        name: 'Online Store',
        endpoint: '/api/services/ecommerce/store',
        status: 'active'
      },
      {
        name: 'Payment Processing',
        endpoint: '/api/services/ecommerce/payments',
        status: 'active'
      },
      {
        name: 'Order Management',
        endpoint: '/api/services/ecommerce/orders',
        status: 'active'
      }
    ],
    userAccess: {
      userId: req.user?.id,
      businessType: req.user?.businessInfo?.businessType,
      storeUrl: `https://store.neture.co.kr/${req.user?.id}`,
      allowedServices: ['store', 'payments', 'orders']
    }
  });
});

// 크라우드펀딩 서비스 접근
router.get('/crowdfunding', (req: AuthRequest, res) => {
  res.json({
    message: 'Crowdfunding Services Access',
    services: [
      {
        name: 'Project Creation',
        endpoint: '/api/services/crowdfunding/projects',
        status: 'active'
      },
      {
        name: 'Campaign Management',
        endpoint: '/api/services/crowdfunding/campaigns',
        status: 'active'
      },
      {
        name: 'Backer Analytics',
        endpoint: '/api/services/crowdfunding/analytics',
        status: 'beta'
      }
    ],
    userAccess: {
      userId: req.user?.id,
      businessType: req.user?.businessInfo?.businessType,
      allowedServices: ['projects', 'campaigns']
    }
  });
});

// 포럼 서비스 접근
router.get('/forum', (req: AuthRequest, res) => {
  res.json({
    message: 'Forum Services Access',
    services: [
      {
        name: 'Community Forum',
        endpoint: '/api/services/forum/community',
        status: 'active'
      },
      {
        name: 'Business Network',
        endpoint: '/api/services/forum/business',
        status: 'active'
      },
      {
        name: 'Knowledge Base',
        endpoint: '/api/services/forum/knowledge',
        status: 'active'
      }
    ],
    userAccess: {
      userId: req.user?.id,
      businessType: req.user?.businessInfo?.businessType,
      allowedServices: ['community', 'business', 'knowledge']
    }
  });
});

// 사이니지 서비스 접근
router.get('/signage', (req: AuthRequest, res) => {
  res.json({
    message: 'Digital Signage Services Access',
    services: [
      {
        name: 'Display Management',
        endpoint: '/api/services/signage/displays',
        status: 'active'
      },
      {
        name: 'Content Creator',
        endpoint: '/api/services/signage/content',
        status: 'active'
      },
      {
        name: 'Schedule Manager',
        endpoint: '/api/services/signage/schedule',
        status: 'beta'
      }
    ],
    userAccess: {
      userId: req.user?.id,
      businessType: req.user?.businessInfo?.businessType,
      allowedServices: ['displays', 'content']
    }
  });
});

// 서비스 상태 확인
router.get('/status', (req: AuthRequest, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    services: {
      ai: { status: 'operational', version: '1.0.0' },
      rpa: { status: 'operational', version: '1.0.0' },
      ecommerce: { status: 'operational', version: '1.0.0' },
      crowdfunding: { status: 'operational', version: '1.0.0' },
      forum: { status: 'operational', version: '1.0.0' },
      signage: { status: 'maintenance', version: '0.9.0' }
    },
    user: {
      id: req.user?.id,
      name: req.user?.name,
      businessType: req.user?.businessInfo?.businessType,
      accessLevel: req.user?.role
    }
  });
});

export default router;
