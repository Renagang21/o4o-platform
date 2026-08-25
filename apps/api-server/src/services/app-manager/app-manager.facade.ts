/**
 * AppManager — Facade (read-only registry access)
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1 에서 분리된 facade.
 *
 * WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1
 *   (판정 ADMIN_APPS_WRITE_RETIRE)
 *
 * write 계열(install / activate / deactivate / canUninstall / uninstall / update / rollback)을
 * 제거했다. 유일한 호출자였던 `/api/v1/admin/apps` write 8종이 소비처 0(frontend 호출 0 ·
 * production 30일 로그 0 · `app_registry` 6행 모두 seed 이후 무변경)으로 확인돼 함께 은퇴했다.
 *
 * 따라서 AppManager 의 canonical 책임은 **`app_registry` 운영 상태 read** 하나다:
 *   - `GET /api/v1/admin/apps` (플랫폼 관리자 조회)
 *   - `GET /api/v1/apps/availability` (메뉴·라우트 게이팅 — 실사용)
 *
 * ⚠ `app_registry` 테이블·6행은 그대로 둔다. 이 WO 는 DB schema change 0 / migration 0 /
 *    production write 0 이다.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AppRegistry } from '../../entities/AppRegistry.js';
import {
  listInstalled,
  getAppStatus,
  isAppActive,
  listActiveApps,
  getVersionInfo,
} from './app-manager.registry.js';

export class AppManager {
  private repo: Repository<AppRegistry>;

  constructor() {
    this.repo = AppDataSource.getRepository(AppRegistry);
  }

  async listInstalled(): Promise<AppRegistry[]> {
    return listInstalled(this.repo);
  }

  async getAppStatus(appId: string): Promise<AppRegistry | null> {
    return getAppStatus(this.repo, appId);
  }

  async isAppActive(appId: string): Promise<boolean> {
    return isAppActive(this.repo, appId);
  }

  async listActiveApps(): Promise<AppRegistry[]> {
    return listActiveApps(this.repo);
  }

  async getVersionInfo(appId: string): Promise<{
    appId: string;
    currentVersion: string;
    previousVersion: string | null;
    availableVersion: string | null;
    hasUpdate: boolean;
    canRollback: boolean;
  }> {
    return getVersionInfo(this.repo, appId);
  }
}
