import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { checkPermission } from '../../middleware/permissions';
import AppDataSource from '../../database/data-source';
import { In } from 'typeorm';

const router: Router = Router();

// 플러그인 데이터 (실제로는 DB에서 관리)
interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorUri?: string;
  pluginUri?: string;
  license?: string;
  category: string;
  tags: string[];
  status: 'active' | 'inactive' | 'update-available' | 'error';
  isCore: boolean;
  dependencies?: string[];
  requiredVersion?: string;
  testedUpTo?: string;
  rating?: number;
  activeInstalls?: number;
  lastUpdated?: string;
  updateVersion?: string;
  permissions?: string[];
  settings?: any;
}

// 플러그인 상태를 메모리에 저장 (실제로는 DB 사용)
const pluginStates: Map<string, Plugin> = new Map([
  ['ecommerce', {
    id: 'ecommerce',
    name: 'O4O eCommerce',
    description: '완벽한 온라인 쇼핑몰 솔루션',
    version: '2.0.0',
    author: 'O4O Team',
    category: 'Sales',
    tags: ['ecommerce', 'shop', 'payment'],
    status: 'active',
    isCore: true,
    permissions: ['manage_products', 'manage_orders']
  }],
  ['affiliate', {
    id: 'affiliate',
    name: 'Affiliate Marketing Pro',
    description: '제휴 마케팅 시스템',
    version: '1.5.0',
    author: 'O4O Team',
    category: 'Marketing',
    tags: ['affiliate', 'marketing'],
    status: 'inactive',
    isCore: false,
    dependencies: ['ecommerce'],
    permissions: ['manage_affiliates']
  }],
  ['crowdfunding', {
    id: 'crowdfunding',
    name: 'CrowdFunding Platform',
    description: '크라우드펀딩 플랫폼',
    version: '1.2.0',
    author: 'O4O Team',
    category: 'Finance',
    tags: ['crowdfunding', 'donation'],
    status: 'active',
    isCore: false,
    dependencies: ['ecommerce']
  }],
  ['forum', {
    id: 'forum',
    name: 'Community Forums',
    description: '커뮤니티 포럼',
    version: '1.8.0',
    author: 'O4O Team',
    category: 'Community',
    tags: ['forum', 'community'],
    status: 'active',
    isCore: false
  }],
  ['signage', {
    id: 'signage',
    name: 'Digital Signage Manager',
    description: '디지털 사이니지 관리',
    version: '1.0.0',
    author: 'O4O Team',
    category: 'Media',
    tags: ['signage', 'display'],
    status: 'active',
    isCore: false
  }],
  ['dropshipping', {
    id: 'dropshipping',
    name: 'Dropshipping Integration',
    description: '드롭쉬핑 자동화',
    version: '1.1.0',
    author: 'O4O Team',
    category: 'Sales',
    tags: ['dropshipping', 'supplier'],
    status: 'active',
    isCore: false,
    dependencies: ['ecommerce']
  }],
  ['analytics', {
    id: 'analytics',
    name: 'Advanced Analytics',
    description: '고급 분석 및 리포팅',
    version: '2.5.0',
    author: 'O4O Team',
    category: 'Analytics',
    tags: ['analytics', 'reports'],
    status: 'active',
    isCore: false
  }],
  ['seo', {
    id: 'seo',
    name: 'SEO Optimizer',
    description: '검색엔진 최적화',
    version: '3.0.0',
    author: 'O4O Team',
    category: 'SEO',
    tags: ['seo', 'optimization'],
    status: 'active',
    isCore: false
  }]
]);

/**
 * @route   GET /api/v1/apps/plugins
 * @desc    Get all plugins
 * @access  Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const plugins = Array.from(pluginStates.values());
    
    res.json({
      success: true,
      data: plugins,
      total: plugins.length
    });
  } catch (error) {
    console.error('Error fetching plugins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plugins'
    });
  }
});

/**
 * @route   GET /api/v1/apps/plugins/:id
 * @desc    Get plugin by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const plugin = pluginStates.get(id);
    
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: 'Plugin not found'
      });
    }
    
    res.json({
      success: true,
      data: plugin
    });
  } catch (error) {
    console.error('Error fetching plugin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plugin'
    });
  }
});

/**
 * @route   PUT /api/v1/apps/plugins/:id/toggle
 * @desc    Toggle plugin activation status
 * @access  Private (Admin only)
 */
router.put('/:id/toggle', 
  authenticateToken, 
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      const plugin = pluginStates.get(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: 'Plugin not found'
        });
      }
      
      // 핵심 플러그인은 비활성화할 수 없음
      if (plugin.isCore && !isActive) {
        return res.status(400).json({
          success: false,
          error: 'Core plugins cannot be deactivated'
        });
      }
      
      // 의존성 체크
      if (isActive && plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          const depPlugin = pluginStates.get(dep);
          if (!depPlugin || depPlugin.status !== 'active') {
            return res.status(400).json({
              success: false,
              error: `Required plugin "${dep}" is not active`
            });
          }
        }
      }
      
      // 이 플러그인에 의존하는 다른 플러그인 체크
      if (!isActive) {
        const dependentPlugins = Array.from(pluginStates.values())
          .filter(p => p.dependencies?.includes(id) && p.status === 'active');
        
        if (dependentPlugins.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Cannot deactivate. Following plugins depend on this: ${dependentPlugins.map(p => p.name).join(', ')}`
          });
        }
      }
      
      // 상태 업데이트
      plugin.status = isActive ? 'active' : 'inactive';
      pluginStates.set(id, plugin);
      
      res.json({
        success: true,
        data: plugin,
        message: `Plugin ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling plugin:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle plugin status'
      });
    }
  }
);

/**
 * @route   POST /api/v1/apps/plugins/:id/settings
 * @desc    Update plugin settings
 * @access  Private (Admin only)
 */
router.post('/:id/settings',
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { settings } = req.body;
      
      const plugin = pluginStates.get(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: 'Plugin not found'
        });
      }
      
      // 설정 저장
      plugin.settings = settings;
      pluginStates.set(id, plugin);
      
      res.json({
        success: true,
        data: plugin,
        message: 'Plugin settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating plugin settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update plugin settings'
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/apps/plugins/:id
 * @desc    Delete/uninstall plugin
 * @access  Private (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const plugin = pluginStates.get(id);
      
      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: 'Plugin not found'
        });
      }
      
      // 핵심 플러그인은 삭제할 수 없음
      if (plugin.isCore) {
        return res.status(400).json({
          success: false,
          error: 'Core plugins cannot be deleted'
        });
      }
      
      // 이 플러그인에 의존하는 다른 플러그인 체크
      const dependentPlugins = Array.from(pluginStates.values())
        .filter(p => p.dependencies?.includes(id));
      
      if (dependentPlugins.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete. Following plugins depend on this: ${dependentPlugins.map(p => p.name).join(', ')}`
        });
      }
      
      // 플러그인 삭제
      pluginStates.delete(id);
      
      res.json({
        success: true,
        message: 'Plugin deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting plugin:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete plugin'
      });
    }
  }
);

/**
 * @route   POST /api/v1/apps/plugins/install
 * @desc    Install new plugin
 * @access  Private (Admin only)
 */
router.post('/install',
  authenticateToken,
  checkPermission('apps:manage'),
  async (req: Request, res: Response) => {
    try {
      const { pluginData } = req.body;
      
      // 플러그인 유효성 검사
      if (!pluginData.id || !pluginData.name) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plugin data'
        });
      }
      
      // 이미 설치된 플러그인인지 체크
      if (pluginStates.has(pluginData.id)) {
        return res.status(400).json({
          success: false,
          error: 'Plugin already installed'
        });
      }
      
      // 새 플러그인 설치
      const newPlugin: Plugin = {
        ...pluginData,
        status: 'inactive',
        lastUpdated: new Date().toISOString()
      };
      
      pluginStates.set(pluginData.id, newPlugin);
      
      res.json({
        success: true,
        data: newPlugin,
        message: 'Plugin installed successfully'
      });
    } catch (error) {
      console.error('Error installing plugin:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to install plugin'
      });
    }
  }
);

export default router;