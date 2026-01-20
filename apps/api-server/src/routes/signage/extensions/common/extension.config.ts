/**
 * Signage Extension - Configuration
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * Extension 활성화/비활성화 및 Feature Flag 관리
 */

import type { ExtensionType, ExtensionConfig, ExtensionFeatureFlags } from './extension.types.js';

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Extension별 기본 Feature Flags
 */
const defaultFeatureFlags: Record<ExtensionType, ExtensionFeatureFlags> = {
  pharmacy: {
    aiGeneration: true,
    forceContent: true, // pharmacy-hq는 Force 허용
    analytics: true,
    selfEdit: false,
  },
  cosmetics: {
    aiGeneration: true,
    forceContent: false, // Force 불허
    analytics: true,
    selfEdit: false,
  },
  seller: {
    aiGeneration: false,
    forceContent: false, // Force 불허
    analytics: true,
    selfEdit: true, // 파트너 셀프 편집 허용
  },
  tourist: {
    aiGeneration: true, // 다국어 번역
    forceContent: false, // Force 불허
    analytics: true,
    selfEdit: false,
  },
};

/**
 * Extension별 기본 설정
 */
const defaultConfigs: Record<ExtensionType, ExtensionConfig> = {
  pharmacy: {
    type: 'pharmacy',
    status: 'enabled',
    version: '1.0.0',
    features: defaultFeatureFlags.pharmacy,
  },
  cosmetics: {
    type: 'cosmetics',
    status: 'enabled',
    version: '1.0.0',
    features: defaultFeatureFlags.cosmetics,
  },
  seller: {
    type: 'seller',
    status: 'enabled',
    version: '1.0.0',
    features: defaultFeatureFlags.seller,
  },
  tourist: {
    type: 'tourist',
    status: 'disabled', // P4 - 구현 보류
    version: '1.0.0',
    features: defaultFeatureFlags.tourist,
  },
};

// ============================================================================
// EXTENSION REGISTRY
// ============================================================================

/**
 * Extension Registry
 * 런타임 Extension 상태 관리
 */
class ExtensionRegistry {
  private configs: Map<ExtensionType, ExtensionConfig> = new Map();
  private organizationOverrides: Map<string, Map<ExtensionType, Partial<ExtensionConfig>>> = new Map();

  constructor() {
    // 기본 설정 로드
    Object.entries(defaultConfigs).forEach(([type, config]) => {
      this.configs.set(type as ExtensionType, { ...config });
    });
  }

  /**
   * Extension 설정 조회
   */
  getConfig(type: ExtensionType): ExtensionConfig | undefined {
    return this.configs.get(type);
  }

  /**
   * Extension 활성화 여부
   */
  isEnabled(type: ExtensionType): boolean {
    const config = this.configs.get(type);
    return config?.status === 'enabled';
  }

  /**
   * 조직별 Extension 활성화 여부
   */
  isEnabledForOrganization(type: ExtensionType, organizationId: string): boolean {
    // 기본 활성화 여부 확인
    if (!this.isEnabled(type)) {
      return false;
    }

    // 조직별 오버라이드 확인
    const orgOverrides = this.organizationOverrides.get(organizationId);
    if (orgOverrides) {
      const override = orgOverrides.get(type);
      if (override?.status) {
        return override.status === 'enabled';
      }
    }

    return true;
  }

  /**
   * Feature Flag 확인
   */
  isFeatureEnabled(type: ExtensionType, feature: keyof ExtensionFeatureFlags): boolean {
    const config = this.configs.get(type);
    return config?.features[feature] ?? false;
  }

  /**
   * 활성화된 Extension 목록
   */
  getEnabledExtensions(): ExtensionType[] {
    const enabled: ExtensionType[] = [];
    this.configs.forEach((config, type) => {
      if (config.status === 'enabled') {
        enabled.push(type);
      }
    });
    return enabled;
  }

  /**
   * Extension 상태 변경 (런타임)
   */
  setStatus(type: ExtensionType, status: ExtensionConfig['status']): void {
    const config = this.configs.get(type);
    if (config) {
      config.status = status;
    }
  }

  /**
   * 조직별 Extension 설정 오버라이드
   */
  setOrganizationOverride(
    organizationId: string,
    type: ExtensionType,
    override: Partial<ExtensionConfig>
  ): void {
    if (!this.organizationOverrides.has(organizationId)) {
      this.organizationOverrides.set(organizationId, new Map());
    }
    this.organizationOverrides.get(organizationId)!.set(type, override);
  }

  /**
   * 모든 Extension 설정 조회
   */
  getAllConfigs(): Record<ExtensionType, ExtensionConfig> {
    const result: Partial<Record<ExtensionType, ExtensionConfig>> = {};
    this.configs.forEach((config, type) => {
      result[type] = { ...config };
    });
    return result as Record<ExtensionType, ExtensionConfig>;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Extension Registry 싱글톤
 */
export const extensionRegistry = new ExtensionRegistry();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extension 활성화 여부 확인 (단축 함수)
 */
export function isExtensionEnabled(type: ExtensionType): boolean {
  return extensionRegistry.isEnabled(type);
}

/**
 * Extension Feature 활성화 여부 확인 (단축 함수)
 */
export function isExtensionFeatureEnabled(
  type: ExtensionType,
  feature: keyof ExtensionFeatureFlags
): boolean {
  return extensionRegistry.isFeatureEnabled(type, feature);
}

/**
 * Force Content 허용 여부 확인
 */
export function canForceContent(type: ExtensionType): boolean {
  return extensionRegistry.isFeatureEnabled(type, 'forceContent');
}

/**
 * AI Generation 허용 여부 확인
 */
export function canUseAiGeneration(type: ExtensionType): boolean {
  return extensionRegistry.isFeatureEnabled(type, 'aiGeneration');
}

/**
 * Self Edit 허용 여부 확인
 */
export function canSelfEdit(type: ExtensionType): boolean {
  return extensionRegistry.isFeatureEnabled(type, 'selfEdit');
}
