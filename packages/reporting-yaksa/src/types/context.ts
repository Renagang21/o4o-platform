import { DataSource } from 'typeorm';

/**
 * App Context
 *
 * 앱 라이프사이클 훅에서 사용되는 컨텍스트
 */
export interface AppContext {
  dataSource: DataSource;
  config?: Record<string, any>;
}

/**
 * Install Context
 */
export interface InstallContext extends AppContext {
  force?: boolean;
}

/**
 * Activate Context
 */
export interface ActivateContext extends AppContext {
  previousVersion?: string;
}

/**
 * Deactivate Context
 */
export interface DeactivateContext extends AppContext {
  reason?: string;
}

/**
 * Uninstall Context
 */
export interface UninstallContext extends AppContext {
  keepData?: boolean;
  backup?: boolean;
}
