import { DataSource } from 'typeorm';

/**
 * App Manifest Interface
 */
export interface AppManifest {
  appId: string;
  name: string;
  version: string;
  type: 'core' | 'extension';
  description: string;
  author?: {
    name: string;
    email: string;
    url: string;
  };
  dependencies: AppDependency[];
  ownsTables: string[];
  permissions: Permission[];
  lifecycle?: {
    install?: string;
    activate?: string;
    deactivate?: string;
    uninstall?: string;
  };
  routes?: Route[];
  customPostTypes?: any[];
  advancedCustomFields?: any[];
  blocks?: any[];
  settings?: Record<string, any>;
}

export interface AppDependency {
  appId: string;
  version: string;
  required: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category?: string;
}

export interface Route {
  path: string;
  method: string;
  handler: string;
  permission?: string;
}

/**
 * Logger Interface
 */
export interface Logger {
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
  debug(message: string, ...meta: any[]): void;
}

/**
 * InstallContext
 *
 * install hook에 전달되는 컨텍스트
 */
export interface InstallContext {
  /**
   * TypeORM DataSource
   */
  dataSource: DataSource;

  /**
   * 앱 manifest
   */
  manifest: AppManifest;

  /**
   * 로거
   */
  logger: Logger;

  /**
   * 설치 옵션
   */
  options?: {
    /**
     * 초기 데이터 생성 여부
     */
    seedDefaultData?: boolean;
    [key: string]: any;
  };
}

/**
 * ActivateContext
 *
 * activate hook에 전달되는 컨텍스트
 */
export interface ActivateContext {
  /**
   * TypeORM DataSource
   */
  dataSource: DataSource;

  /**
   * 앱 manifest
   */
  manifest: AppManifest;

  /**
   * 로거
   */
  logger: Logger;

  /**
   * HTTP 서버 인스턴스 (선택적)
   */
  app?: any;
}

/**
 * DeactivateContext
 *
 * deactivate hook에 전달되는 컨텍스트
 */
export interface DeactivateContext {
  /**
   * TypeORM DataSource
   */
  dataSource: DataSource;

  /**
   * 앱 manifest
   */
  manifest: AppManifest;

  /**
   * 로거
   */
  logger: Logger;
}

/**
 * UninstallContext
 *
 * uninstall hook에 전달되는 컨텍스트
 */
export interface UninstallContext {
  /**
   * TypeORM DataSource
   */
  dataSource: DataSource;

  /**
   * 앱 manifest
   */
  manifest: AppManifest;

  /**
   * 로거
   */
  logger: Logger;

  /**
   * 삭제 옵션
   */
  options?: {
    /**
     * 데이터 삭제 여부 (기본값: false)
     */
    purgeData?: boolean;

    /**
     * 테이블 삭제 여부 (기본값: false)
     */
    dropTables?: boolean;

    [key: string]: any;
  };
}
