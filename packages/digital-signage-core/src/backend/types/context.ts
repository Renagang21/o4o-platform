/**
 * Digital Signage Core App Context Types
 */

export interface BaseContext {
  dataSource: any; // TypeORM DataSource
  manifest: {
    appId: string;
    name: string;
    version: string;
    ownsTables: string[];
    [key: string]: any;
  };
  logger: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  };
  config?: Record<string, any>;
}

export interface InstallContext extends BaseContext {
  organizationId?: string;
}

export interface ActivateContext extends BaseContext {
  organizationId?: string;
}

export interface DeactivateContext extends BaseContext {
  organizationId?: string;
}

export interface UninstallContext extends BaseContext {
  organizationId?: string;
  purgeData?: boolean;
}
