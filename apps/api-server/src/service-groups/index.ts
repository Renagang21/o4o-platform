/**
 * Service Group Expansion Framework
 * Phase 10 Task 4 — ServiceGroup Expansion Framework
 *
 * Provides standardized framework for creating new service groups.
 * Each service group requires:
 * - Template
 * - InitPack
 * - ThemePreset
 * - Navigation Keys
 * - Default Views
 * - Extension compatibility rules
 */

import logger from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Service Group Definition
 */
export interface ServiceGroupDefinition {
  /** Unique service group identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Category for organization */
  category: ServiceGroupCategory;

  /** Icon for UI display */
  icon?: string;

  /** Color theme */
  primaryColor?: string;

  /** Navigation configuration */
  navigation: NavigationConfig;

  /** View configuration */
  views: ViewConfig;

  /** Theme configuration */
  theme: ThemeConfig;

  /** App configuration */
  apps: AppConfig;

  /** InitPack configuration */
  initPack: InitPackConfig;

  /** Template configuration */
  template: TemplateConfig;

  /** Extension compatibility rules */
  extensionRules: ExtensionRules;

  /** Metadata */
  metadata?: {
    author?: string;
    version?: string;
    createdAt?: Date;
    documentation?: string;
  };

  /** Whether this service group is active */
  isActive: boolean;
}

/**
 * Service group category
 */
export type ServiceGroupCategory =
  | 'commerce'     // E-commerce, retail
  | 'organization' // Internal organization tools
  | 'community'    // Community, social
  | 'education'    // LMS, training
  | 'health'       // Healthcare, pharmacy
  | 'b2b'          // Business to business
  | 'custom';      // Custom/other

/**
 * Navigation configuration
 */
export interface NavigationConfig {
  /** Required navigation keys for this service group */
  requiredKeys: string[];

  /** Forbidden navigation keys (from other service groups) */
  forbiddenKeys: string[];

  /** Default menu structure */
  defaultMenus: Array<{
    key: string;
    label: string;
    icon?: string;
    path: string;
    order: number;
    children?: Array<{
      key: string;
      label: string;
      path: string;
    }>;
  }>;

  /** Admin navigation items */
  adminNavItems?: Array<{
    key: string;
    label: string;
    path: string;
    icon?: string;
  }>;
}

/**
 * View configuration
 */
export interface ViewConfig {
  /** Expected view templates */
  expectedViews: string[];

  /** Forbidden views (from other service groups) */
  forbiddenViews: string[];

  /** Default view mappings */
  defaultViewMappings: Record<string, string>;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Allowed theme presets */
  allowedPresets: string[];

  /** Default preset ID */
  defaultPreset: string;

  /** Default color scheme */
  defaultColors?: {
    primary: string;
    secondary: string;
    accent?: string;
  };

  /** CSS variables */
  cssVariables?: Record<string, string>;
}

/**
 * App configuration
 */
export interface AppConfig {
  /** Required core apps */
  requiredCoreApps: string[];

  /** Recommended extension apps */
  recommendedExtensions: string[];

  /** Incompatible apps */
  incompatibleApps: string[];
}

/**
 * InitPack configuration
 */
export interface InitPackConfig {
  /** InitPack ID pattern */
  initPackIdPattern: string;

  /** Default categories */
  defaultCategories?: Array<{
    slug: string;
    name: string;
  }>;

  /** Default pages */
  defaultPages?: Array<{
    slug: string;
    title: string;
    template: string;
  }>;

  /** Default roles */
  defaultRoles?: string[];

  /** Seed data configuration */
  seedDataConfig?: {
    includeSampleData: boolean;
    sampleDataTypes?: string[];
  };
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  /** Template ID pattern */
  templateIdPattern: string;

  /** Default version */
  defaultVersion: string;

  /** Auto-install behavior */
  autoInstall: boolean;

  /** Default settings */
  defaultSettings?: Record<string, unknown>;
}

/**
 * Extension compatibility rules
 */
export interface ExtensionRules {
  /** Extensions that must be installed */
  required: string[];

  /** Extensions that are recommended */
  recommended: string[];

  /** Extensions that are incompatible */
  incompatible: string[];

  /** Version constraints for extensions */
  versionConstraints?: Record<string, string>;
}

/**
 * Service group creation request
 */
export interface CreateServiceGroupRequest {
  id: string;
  name: string;
  description: string;
  category: ServiceGroupCategory;
  basedOn?: string; // Existing service group to clone from
  customization?: Partial<ServiceGroupDefinition>;
}

/**
 * Service group validation result
 */
export interface ServiceGroupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

// =============================================================================
// Pre-defined Service Groups
// =============================================================================

export const PREDEFINED_SERVICE_GROUPS: Record<string, ServiceGroupDefinition> = {
  cosmetics: {
    id: 'cosmetics',
    name: '화장품 드롭쉬핑',
    description: '화장품 드롭쉬핑 서비스를 위한 서비스 그룹',
    category: 'commerce',
    icon: 'sparkles',
    primaryColor: '#FF69B4',
    navigation: {
      requiredKeys: ['products', 'orders', 'customers', 'analytics'],
      forbiddenKeys: ['pharmacy', 'cgm', 'lms', 'membership'],
      defaultMenus: [
        { key: 'products', label: '상품 관리', path: '/products', order: 1 },
        { key: 'orders', label: '주문 관리', path: '/orders', order: 2 },
        { key: 'customers', label: '고객 관리', path: '/customers', order: 3 },
        { key: 'analytics', label: '분석', path: '/analytics', order: 4 },
      ],
    },
    views: {
      expectedViews: ['ProductList', 'ProductDetail', 'OrderList', 'CustomerProfile'],
      forbiddenViews: ['PharmacyDashboard', 'LMSCourse', 'MembershipCard'],
      defaultViewMappings: {
        'cpt:product': 'ProductList',
        'cpt:order': 'OrderList',
      },
    },
    theme: {
      allowedPresets: ['cosmetics-default', 'cosmetics-luxury', 'cosmetics-natural'],
      defaultPreset: 'cosmetics-default',
      defaultColors: {
        primary: '#FF69B4',
        secondary: '#FFC0CB',
      },
    },
    apps: {
      requiredCoreApps: ['cms-core', 'organization-core', 'dropshipping-cosmetics'],
      recommendedExtensions: ['review-core', 'analytics-core'],
      incompatibleApps: ['forum-yaksa', 'membership-yaksa', 'lms-yaksa'],
    },
    initPack: {
      initPackIdPattern: 'cosmetics-*-init',
      defaultCategories: [
        { slug: 'skincare', name: '스킨케어' },
        { slug: 'makeup', name: '메이크업' },
        { slug: 'haircare', name: '헤어케어' },
      ],
      defaultPages: [
        { slug: 'home', title: '홈', template: 'home' },
        { slug: 'products', title: '상품', template: 'product-list' },
      ],
      defaultRoles: ['admin', 'seller', 'customer'],
    },
    template: {
      templateIdPattern: 'cosmetics-*-template',
      defaultVersion: '1.0.0',
      autoInstall: true,
    },
    extensionRules: {
      required: [],
      recommended: ['review-core'],
      incompatible: ['forum-yaksa', 'membership-yaksa'],
    },
    isActive: true,
  },

  yaksa: {
    id: 'yaksa',
    name: '약사 인트라넷',
    description: '약국 및 약사 조직을 위한 인트라넷 서비스',
    category: 'organization',
    icon: 'pill',
    primaryColor: '#2563EB',
    navigation: {
      requiredKeys: ['forum', 'members', 'reports', 'education'],
      forbiddenKeys: ['products', 'orders', 'cosmetics'],
      defaultMenus: [
        { key: 'forum', label: '게시판', path: '/forum', order: 1 },
        { key: 'members', label: '회원', path: '/members', order: 2 },
        { key: 'reports', label: '리포트', path: '/reports', order: 3 },
        { key: 'education', label: '교육', path: '/education', order: 4 },
      ],
    },
    views: {
      expectedViews: ['ForumList', 'MemberList', 'ReportDashboard', 'LMSCourseList'],
      forbiddenViews: ['ProductList', 'OrderList', 'CosmeticsRecommendation'],
      defaultViewMappings: {
        'cpt:forum_post': 'ForumList',
        'cpt:member': 'MemberList',
      },
    },
    theme: {
      allowedPresets: ['yaksa-default', 'yaksa-professional', 'yaksa-modern'],
      defaultPreset: 'yaksa-default',
      defaultColors: {
        primary: '#2563EB',
        secondary: '#93C5FD',
      },
    },
    apps: {
      requiredCoreApps: ['cms-core', 'organization-core', 'forum-yaksa', 'membership-yaksa'],
      recommendedExtensions: ['reporting-yaksa', 'lms-yaksa'],
      incompatibleApps: ['dropshipping-cosmetics', 'cosmetics-core'],
    },
    initPack: {
      initPackIdPattern: 'yaksa-*-init',
      defaultCategories: [
        { slug: 'notice', name: '공지사항' },
        { slug: 'qna', name: 'Q&A' },
        { slug: 'resources', name: '자료실' },
      ],
      defaultPages: [
        { slug: 'home', title: '홈', template: 'home' },
        { slug: 'forum', title: '게시판', template: 'forum-list' },
      ],
      defaultRoles: ['admin', 'pharmacist', 'member'],
    },
    template: {
      templateIdPattern: 'yaksa-*-template',
      defaultVersion: '1.0.0',
      autoInstall: true,
    },
    extensionRules: {
      required: [],
      recommended: ['reporting-yaksa', 'lms-yaksa'],
      incompatible: ['dropshipping-cosmetics'],
    },
    isActive: true,
  },

  // Placeholder for future service groups
  hospital: {
    id: 'hospital',
    name: '병원 서비스',
    description: '병원 및 의료 기관을 위한 서비스',
    category: 'health',
    icon: 'hospital',
    primaryColor: '#059669',
    navigation: {
      requiredKeys: ['patients', 'appointments', 'records', 'billing'],
      forbiddenKeys: ['products', 'cosmetics', 'forum'],
      defaultMenus: [
        { key: 'patients', label: '환자 관리', path: '/patients', order: 1 },
        { key: 'appointments', label: '예약', path: '/appointments', order: 2 },
      ],
    },
    views: {
      expectedViews: ['PatientList', 'AppointmentCalendar'],
      forbiddenViews: ['ProductList', 'ForumList'],
      defaultViewMappings: {},
    },
    theme: {
      allowedPresets: ['hospital-default'],
      defaultPreset: 'hospital-default',
      defaultColors: {
        primary: '#059669',
        secondary: '#A7F3D0',
      },
    },
    apps: {
      requiredCoreApps: ['cms-core', 'organization-core'],
      recommendedExtensions: [],
      incompatibleApps: ['dropshipping-cosmetics', 'forum-yaksa'],
    },
    initPack: {
      initPackIdPattern: 'hospital-*-init',
    },
    template: {
      templateIdPattern: 'hospital-*-template',
      defaultVersion: '1.0.0',
      autoInstall: true,
    },
    extensionRules: {
      required: [],
      recommended: [],
      incompatible: [],
    },
    isActive: false, // Not yet implemented
  },

  'b2b-education': {
    id: 'b2b-education',
    name: 'B2B 교육',
    description: '기업 교육 및 LMS 서비스',
    category: 'education',
    icon: 'graduation-cap',
    primaryColor: '#7C3AED',
    navigation: {
      requiredKeys: ['courses', 'students', 'certificates', 'analytics'],
      forbiddenKeys: ['products', 'cosmetics', 'pharmacy'],
      defaultMenus: [
        { key: 'courses', label: '강의', path: '/courses', order: 1 },
        { key: 'students', label: '수강생', path: '/students', order: 2 },
      ],
    },
    views: {
      expectedViews: ['CourseList', 'StudentList', 'CertificateList'],
      forbiddenViews: ['ProductList', 'PharmacyDashboard'],
      defaultViewMappings: {},
    },
    theme: {
      allowedPresets: ['education-default'],
      defaultPreset: 'education-default',
      defaultColors: {
        primary: '#7C3AED',
        secondary: '#C4B5FD',
      },
    },
    apps: {
      requiredCoreApps: ['cms-core', 'organization-core', 'lms-core'],
      recommendedExtensions: ['certificate-core', 'analytics-core'],
      incompatibleApps: ['dropshipping-cosmetics'],
    },
    initPack: {
      initPackIdPattern: 'education-*-init',
    },
    template: {
      templateIdPattern: 'education-*-template',
      defaultVersion: '1.0.0',
      autoInstall: true,
    },
    extensionRules: {
      required: [],
      recommended: ['lms-core'],
      incompatible: [],
    },
    isActive: false, // Not yet implemented
  },
};

// =============================================================================
// Service Group Registry
// =============================================================================

export class ServiceGroupRegistry {
  private groups = new Map<string, ServiceGroupDefinition>();

  constructor() {
    // Load predefined groups
    for (const [id, definition] of Object.entries(PREDEFINED_SERVICE_GROUPS)) {
      this.groups.set(id, definition);
    }
  }

  /**
   * Register a new service group
   */
  register(definition: ServiceGroupDefinition): boolean {
    const validation = this.validate(definition);
    if (!validation.isValid) {
      logger.error(`[ServiceGroupRegistry] Invalid service group: ${validation.errors.join(', ')}`);
      return false;
    }

    this.groups.set(definition.id, definition);
    logger.info(`[ServiceGroupRegistry] Registered service group: ${definition.id}`);
    return true;
  }

  /**
   * Get service group by ID
   */
  get(id: string): ServiceGroupDefinition | undefined {
    return this.groups.get(id);
  }

  /**
   * Get all service groups
   */
  getAll(): ServiceGroupDefinition[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get active service groups
   */
  getActive(): ServiceGroupDefinition[] {
    return this.getAll().filter(g => g.isActive);
  }

  /**
   * Get service groups by category
   */
  getByCategory(category: ServiceGroupCategory): ServiceGroupDefinition[] {
    return this.getAll().filter(g => g.category === category);
  }

  /**
   * Validate service group definition
   */
  validate(definition: ServiceGroupDefinition): ServiceGroupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!definition.id) errors.push('Missing id');
    if (!definition.name) errors.push('Missing name');
    if (!definition.category) errors.push('Missing category');

    // Navigation validation
    if (!definition.navigation.requiredKeys.length) {
      warnings.push('No required navigation keys defined');
    }

    // Apps validation
    if (!definition.apps.requiredCoreApps.includes('cms-core')) {
      errors.push('cms-core must be in requiredCoreApps');
    }
    if (!definition.apps.requiredCoreApps.includes('organization-core')) {
      errors.push('organization-core must be in requiredCoreApps');
    }

    // Theme validation
    if (!definition.theme.defaultPreset) {
      errors.push('Missing default theme preset');
    }

    // InitPack validation
    if (!definition.initPack.initPackIdPattern) {
      errors.push('Missing InitPack ID pattern');
    }

    // Template validation
    if (!definition.template.templateIdPattern) {
      errors.push('Missing template ID pattern');
    }

    // Calculate score
    let score = 100;
    score -= errors.length * 20;
    score -= warnings.length * 5;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Create service group from request
   */
  create(request: CreateServiceGroupRequest): ServiceGroupDefinition | null {
    let base: ServiceGroupDefinition;

    if (request.basedOn) {
      const existing = this.get(request.basedOn);
      if (!existing) {
        logger.error(`[ServiceGroupRegistry] Base service group not found: ${request.basedOn}`);
        return null;
      }
      base = JSON.parse(JSON.stringify(existing)); // Deep clone
    } else {
      // Create minimal definition
      base = {
        id: request.id,
        name: request.name,
        description: request.description,
        category: request.category,
        navigation: {
          requiredKeys: [],
          forbiddenKeys: [],
          defaultMenus: [],
        },
        views: {
          expectedViews: [],
          forbiddenViews: [],
          defaultViewMappings: {},
        },
        theme: {
          allowedPresets: ['default'],
          defaultPreset: 'default',
        },
        apps: {
          requiredCoreApps: ['cms-core', 'organization-core'],
          recommendedExtensions: [],
          incompatibleApps: [],
        },
        initPack: {
          initPackIdPattern: `${request.id}-*-init`,
        },
        template: {
          templateIdPattern: `${request.id}-*-template`,
          defaultVersion: '1.0.0',
          autoInstall: true,
        },
        extensionRules: {
          required: [],
          recommended: [],
          incompatible: [],
        },
        isActive: false,
      };
    }

    // Apply customizations
    if (request.customization) {
      Object.assign(base, request.customization);
    }

    // Override ID and basic info
    base.id = request.id;
    base.name = request.name;
    base.description = request.description;
    base.category = request.category;

    // Validate and register
    if (this.register(base)) {
      return base;
    }

    return null;
  }

  /**
   * Get registration checklist for new service group
   */
  getRegistrationChecklist(id: string): Array<{
    step: number;
    task: string;
    description: string;
    required: boolean;
    completed: boolean;
  }> {
    const group = this.get(id);

    return [
      {
        step: 1,
        task: 'Define serviceGroup id',
        description: 'Create unique identifier for the service group',
        required: true,
        completed: !!group?.id,
      },
      {
        step: 2,
        task: 'Add navigation keys',
        description: 'Define required and forbidden navigation keys',
        required: true,
        completed: !!group?.navigation.requiredKeys.length,
      },
      {
        step: 3,
        task: 'Add views',
        description: 'Define expected and forbidden view templates',
        required: true,
        completed: !!group?.views.expectedViews.length,
      },
      {
        step: 4,
        task: 'Add default theme',
        description: 'Configure theme presets and colors',
        required: true,
        completed: !!group?.theme.defaultPreset,
      },
      {
        step: 5,
        task: 'Add InitPack',
        description: 'Create InitPack with default data',
        required: true,
        completed: !!group?.initPack.initPackIdPattern,
      },
      {
        step: 6,
        task: 'Add Template',
        description: 'Create service template definition',
        required: true,
        completed: !!group?.template.templateIdPattern,
      },
      {
        step: 7,
        task: 'Add extension compatibility',
        description: 'Define extension rules and constraints',
        required: false,
        completed: !!group?.extensionRules,
      },
    ];
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    active: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};

    for (const group of this.groups.values()) {
      byCategory[group.category] = (byCategory[group.category] || 0) + 1;
    }

    return {
      total: this.groups.size,
      active: this.getActive().length,
      byCategory,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const serviceGroupRegistry = new ServiceGroupRegistry();

export default serviceGroupRegistry;
