/**
 * Unified Public Store Routes — Service-agnostic public storefront API
 *
 * WO-STORE-SLUG-UNIFICATION-V1
 * WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1: Facade — sub-handlers compose
 *
 * All endpoints resolve slug → storeId + serviceKey internally via StoreSlugService.
 * Consumers never need to know the service_key — just the slug.
 *
 * Mount: /api/v1/stores (before store-policy.routes.ts)
 *
 * Public (no auth):
 *   GET  /:slug                      — Store info
 *   GET  /:slug/products/featured    — Featured products (B2C visibility gate)
 *   GET  /:slug/products             — Product list (B2C visibility gate, paginated)
 *   GET  /:slug/products/:id         — Product detail (B2C visibility gate)
 *   GET  /:slug/categories           — Product categories (B2C visibility gate)
 *   GET  /:slug/layout               — Block layout + channels
 *   GET  /:slug/blog                 — Published blog posts
 *   GET  /:slug/blog/:postSlug       — Blog post detail
 *   GET  /:slug/template             — Template profile
 *   GET  /:slug/storefront-config    — Storefront config
 *   GET  /:slug/hero                 — Hero contents
 *   GET  /:slug/tablet/products      — Tablet channel products
 *   POST /:slug/tablet/requests      — Tablet request submission (rate-limited)
 *   POST /:slug/tablet/interest      — Interest request creation (rate-limited, WO-O4O-TABLET-MODULE-V1)
 *   GET  /:slug/tablet/interest/:id  — Interest request status
 *   GET  /:slug/tablet/requests/:id  — Tablet request status
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmProduct } from '../glycopharm/entities/glycopharm-product.entity.js';
import { StoreBlogPost } from '../glycopharm/entities/store-blog-post.entity.js';
import { TabletServiceRequest } from '../glycopharm/entities/tablet-service-request.entity.js';
import { createStorePublicHomeRoutes } from './store-public/store-public-home.handler.js';
import { createStorePublicProductRoutes } from './store-public/store-public-product.handler.js';
import { createStorePublicContentRoutes } from './store-public/store-public-content.handler.js';
import { createStorePublicTabletRoutes } from './store-public/store-public-tablet.handler.js';

export function createUnifiedStorePublicRoutes(dataSource: DataSource): Router {
  const router = Router();
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const blogRepo = dataSource.getRepository(StoreBlogPost);
  const requestRepo = dataSource.getRepository(TabletServiceRequest);

  router.use('/', createStorePublicHomeRoutes({ dataSource, productRepo }));
  router.use('/', createStorePublicProductRoutes({ dataSource }));
  router.use('/', createStorePublicContentRoutes({ dataSource, blogRepo }));
  router.use('/', createStorePublicTabletRoutes({ dataSource, productRepo, requestRepo }));

  return router;
}
