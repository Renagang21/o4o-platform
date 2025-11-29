# @o4o/dropshipping-core

Dropshipping Core App for O4O Platform - Core engine for multi-vendor dropshipping marketplace.

## Overview

This package provides the core dropshipping functionality including:
- Supplier/Seller/Partner management
- Product authorization and distribution
- Commission calculation engine
- Settlement management
- CPT/ACF definitions for dropshipping entities

## Installation

```bash
pnpm add @o4o/dropshipping-core
```

## Usage

### Backend (API Server)

```typescript
import { dropshippingEntities, dropshippingRoutes } from '@o4o/dropshipping-core';

// In TypeORM DataSource
entities: [...dropshippingEntities]

// In Express routes
app.use('/api/v2/seller', dropshippingRoutes.seller);
```

### Admin Dashboard

```typescript
import { DropshippingAdminPages } from '@o4o/dropshipping-core/admin-ui';
```

### Main Site

```typescript
import { SupplierDashboard } from '@o4o/dropshipping-core/main-site';
```

## App Manifest

This package is designed to work with O4O App Store system. See `src/manifest.ts` for app metadata.

## License

Private
