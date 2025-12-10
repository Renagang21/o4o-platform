/**
 * Cosmetics Seller Extension - Activate Hook
 *
 * 앱 활성화 시 실행되는 훅
 */

import type { DataSource, Repository } from 'typeorm';
import type { Router } from 'express';
import { SellerDisplay } from '../backend/entities/seller-display.entity';
import { SellerSample } from '../backend/entities/seller-sample.entity';
import { SellerInventory } from '../backend/entities/seller-inventory.entity';
import { SellerConsultationLog } from '../backend/entities/seller-consultation-log.entity';
import { SellerKPI } from '../backend/entities/seller-kpi.entity';
import { createSellerExtensionRoutes } from '../backend/routes';

export interface ActivateContext {
  dataSource: DataSource;
  appId: string;
  router?: Router;
}

export interface ActivateResult {
  routes?: Router;
  services?: Record<string, unknown>;
}

export async function activate(context: ActivateContext): Promise<ActivateResult> {
  const { dataSource, appId } = context;

  console.log(`[${appId}] Activating cosmetics-seller-extension...`);

  // Get repositories
  const displayRepository: Repository<SellerDisplay> = dataSource.getRepository(SellerDisplay);
  const sampleRepository: Repository<SellerSample> = dataSource.getRepository(SellerSample);
  const inventoryRepository: Repository<SellerInventory> = dataSource.getRepository(SellerInventory);
  const consultationRepository: Repository<SellerConsultationLog> = dataSource.getRepository(SellerConsultationLog);
  const kpiRepository: Repository<SellerKPI> = dataSource.getRepository(SellerKPI);

  // Create routes with dependencies
  const routes = createSellerExtensionRoutes({
    displayRepository,
    sampleRepository,
    inventoryRepository,
    consultationRepository,
    kpiRepository,
  });

  console.log(`[${appId}] Activation completed. Routes registered.`);

  return {
    routes,
    services: {
      displayRepository,
      sampleRepository,
      inventoryRepository,
      consultationRepository,
      kpiRepository,
    },
  };
}

export default activate;
