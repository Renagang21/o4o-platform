/**
 * Neture Routes
 *
 * Work Order: WO-NETURE-CORE-P1 (initial)
 * Work Order: WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1 (community hub)
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createNetureController } from './controllers/neture.controller.js';
import { createNetureCommunityHubController } from './controllers/neture-community-hub.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../middleware/neture-scope.middleware.js';
// WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1: Store HUB controllers
import { createAssetSnapshotController } from '../o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from '../o4o-store/controllers/store-asset-control.controller.js';
import { createStorePlaylistController } from '../o4o-store/controllers/store-playlist.controller.js';
// WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1
import { createNetureEventOfferController } from './controllers/event-offer.controller.js';
// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
import { createSupplierEventOfferProposalsController } from './controllers/supplier-event-offer-proposals.controller.js';

export function createNetureRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Core controller (public + admin endpoints)
  const netureController = createNetureController(dataSource);
  router.use('/', netureController);

  // ============================================================================
  // Community Hub Routes — WO-O4O-NETURE-COMMUNITY-OPERATOR-MANAGEMENT-V1
  // /api/v1/neture/community/*
  // ============================================================================
  const communityHubController = createNetureCommunityHubController(
    dataSource,
    requireAuth as any,
    requireNetureScope as any,
  );
  router.use('/', communityHubController);

  // ============================================================================
  // Store HUB Controllers — WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1
  // /api/v1/neture/assets, /store-assets, /store-playlists
  // ============================================================================
  router.use('/assets', createAssetSnapshotController(dataSource, requireAuth as any));
  router.use('/store-assets', createStoreAssetControlController(dataSource, requireAuth as any));
  router.use('/store-playlists', createStorePlaylistController(dataSource, requireAuth as any));

  // ============================================================================
  // Event Offer Routes — WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1
  // /api/v1/neture/event-offers/*
  // ============================================================================
  router.use('/event-offers', createNetureEventOfferController(dataSource, requireAuth as any));

  // ============================================================================
  // Supplier Multi-Service Proposal — WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  // /api/v1/neture/supplier/event-offer-proposals
  // ============================================================================
  router.use(
    '/supplier',
    createSupplierEventOfferProposalsController(dataSource, requireAuth as any),
  );

  return router;
}

export default createNetureRoutes;
