/**
 * Phase 9: Seller Authorization System - Seed Data
 *
 * Staging test data for authorization workflow validation
 *
 * Seed Structure:
 * - 3 Partner sellers (with role_seller qualification)
 * - 2 Suppliers
 * - 5 Products (distributed across suppliers)
 * - 12 Authorization requests covering all scenarios
 *
 * Scenarios Covered:
 * A) Approved (5 cases)
 * B) Pending (3 cases)
 * C) Rejected with cooldown (2 cases)
 * D) Revoked (1 case)
 * E) Cancelled (1 case)
 *
 * Usage:
 * ```bash
 * npm run seed:phase9
 * ```
 *
 * Created: 2025-01-07
 */

import { AppDataSource } from '../connection';
import { User } from '../../entities/User';
import { Supplier } from '../../entities/Supplier';
import { Product } from '../../entities/Product';
import { SellerAuthorization, AuthorizationStatus } from '../../entities/SellerAuthorization';
import { SellerAuthorizationAuditLog } from '../../entities/SellerAuthorizationAuditLog';
import * as bcrypt from 'bcrypt';

interface SeedData {
  sellers: User[];
  suppliers: Supplier[];
  products: Product[];
  authorizations: SellerAuthorization[];
}

/**
 * Main seed execution
 */
export async function seedPhase9Authorization(): Promise<SeedData> {
  console.log('🌱 Starting Phase 9 Authorization Seed...\n');

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const supplierRepo = AppDataSource.getRepository(Supplier);
  const productRepo = AppDataSource.getRepository(Product);
  const authRepo = AppDataSource.getRepository(SellerAuthorization);
  const auditRepo = AppDataSource.getRepository(SellerAuthorizationAuditLog);

  // Clean existing data (optional - comment out if you want to preserve existing data)
  // await authRepo.delete({});
  // await auditRepo.delete({});

  // Step 1: Create 3 Partner Sellers
  console.log('📦 Creating 3 partner sellers...');
  const sellers = await Promise.all([
    createSeller(userRepo, {
      username: 'partner-alice',
      email: 'alice@partner.com',
      name: 'Alice\'s Store',
      hasSellerRole: true,
    }),
    createSeller(userRepo, {
      username: 'partner-bob',
      email: 'bob@partner.com',
      name: 'Bob\'s Marketplace',
      hasSellerRole: true,
    }),
    createSeller(userRepo, {
      username: 'partner-charlie',
      email: 'charlie@partner.com',
      name: 'Charlie\'s Shop',
      hasSellerRole: true,
    }),
  ]);
  console.log(`✅ Created ${sellers.length} sellers\n`);

  // Step 2: Create 2 Suppliers
  console.log('🏭 Creating 2 suppliers...');
  const suppliers = await Promise.all([
    createSupplier(supplierRepo, {
      name: 'Premium Electronics Co.',
      code: 'SUP-ELEC-001',
      contactEmail: 'contact@premiumelec.com',
    }),
    createSupplier(supplierRepo, {
      name: 'Fashion Wholesale Inc.',
      code: 'SUP-FASH-002',
      contactEmail: 'sales@fashionwholesale.com',
    }),
  ]);
  console.log(`✅ Created ${suppliers.length} suppliers\n`);

  // Step 3: Create 5 Products
  console.log('📱 Creating 5 products...');
  const products = await Promise.all([
    createProduct(productRepo, {
      name: 'Wireless Headphones Pro',
      sku: 'WHP-001',
      supplierId: suppliers[0].id,
      price: 15900,
    }),
    createProduct(productRepo, {
      name: 'Smart Watch Series X',
      sku: 'SWX-002',
      supplierId: suppliers[0].id,
      price: 29900,
    }),
    createProduct(productRepo, {
      name: 'Premium T-Shirt Collection',
      sku: 'PTS-003',
      supplierId: suppliers[1].id,
      price: 4900,
    }),
    createProduct(productRepo, {
      name: 'Designer Jeans',
      sku: 'DJN-004',
      supplierId: suppliers[1].id,
      price: 8900,
    }),
    createProduct(productRepo, {
      name: 'Leather Backpack',
      sku: 'LBP-005',
      supplierId: suppliers[1].id,
      price: 12900,
    }),
  ]);
  console.log(`✅ Created ${products.length} products\n`);

  // Step 4: Create 12 Authorization Requests (covering all scenarios)
  console.log('🔐 Creating 12 authorization requests...\n');

  const authorizations: SellerAuthorization[] = [];

  // Scenario A: Approved (5 cases)
  console.log('Scenario A: Creating 5 APPROVED authorizations...');
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[0].id,
      productId: products[0].id,
      supplierId: suppliers[0].id,
      status: AuthorizationStatus.APPROVED,
      daysAgo: 30,
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[0].id,
      productId: products[1].id,
      supplierId: suppliers[0].id,
      status: AuthorizationStatus.APPROVED,
      daysAgo: 25,
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[1].id,
      productId: products[2].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.APPROVED,
      daysAgo: 20,
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[1].id,
      productId: products[3].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.APPROVED,
      daysAgo: 15,
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[2].id,
      productId: products[4].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.APPROVED,
      daysAgo: 10,
    })
  );

  // Scenario B: Pending (3 cases)
  console.log('Scenario B: Creating 3 REQUESTED (pending) authorizations...');
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[0].id,
      productId: products[2].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.REQUESTED,
      daysAgo: 2,
      metadata: { businessJustification: 'Expanding into fashion category' },
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[1].id,
      productId: products[0].id,
      supplierId: suppliers[0].id,
      status: AuthorizationStatus.REQUESTED,
      daysAgo: 1,
      metadata: { businessJustification: 'Customer demand for electronics' },
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[2].id,
      productId: products[1].id,
      supplierId: suppliers[0].id,
      status: AuthorizationStatus.REQUESTED,
      daysAgo: 0,
      metadata: { businessJustification: 'New product line addition' },
    })
  );

  // Scenario C: Rejected with cooldown (2 cases)
  console.log('Scenario C: Creating 2 REJECTED (with cooldown) authorizations...');
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[1].id,
      productId: products[4].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.REJECTED,
      daysAgo: 5,
      cooldownDays: 30,
      rejectionReason: 'Insufficient inventory management capability',
    })
  );
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[2].id,
      productId: products[2].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.REJECTED,
      daysAgo: 3,
      cooldownDays: 30,
      rejectionReason: 'Quality standards not met',
    })
  );

  // Scenario D: Revoked (1 case)
  console.log('Scenario D: Creating 1 REVOKED (permanent block) authorization...');
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[2].id,
      productId: products[3].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.REVOKED,
      daysAgo: 7,
      revocationReason: 'Terms of service violation',
    })
  );

  // Scenario E: Cancelled (1 case)
  console.log('Scenario E: Creating 1 CANCELLED authorization...');
  authorizations.push(
    await createAuthorization(authRepo, auditRepo, {
      sellerId: sellers[0].id,
      productId: products[3].id,
      supplierId: suppliers[1].id,
      status: AuthorizationStatus.CANCELLED,
      daysAgo: 4,
    })
  );

  console.log(`\n✅ Created ${authorizations.length} authorization records\n`);

  // Summary
  console.log('📊 Seed Summary:');
  console.log(`   Sellers: ${sellers.length}`);
  console.log(`   Suppliers: ${suppliers.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Authorizations: ${authorizations.length}`);
  console.log(`     - APPROVED: ${authorizations.filter((a) => a.status === AuthorizationStatus.APPROVED).length}`);
  console.log(`     - REQUESTED: ${authorizations.filter((a) => a.status === AuthorizationStatus.REQUESTED).length}`);
  console.log(`     - REJECTED: ${authorizations.filter((a) => a.status === AuthorizationStatus.REJECTED).length}`);
  console.log(`     - REVOKED: ${authorizations.filter((a) => a.status === AuthorizationStatus.REVOKED).length}`);
  console.log(`     - CANCELLED: ${authorizations.filter((a) => a.status === AuthorizationStatus.CANCELLED).length}`);

  console.log('\n✅ Phase 9 Seed Complete!\n');

  await AppDataSource.destroy();

  return { sellers, suppliers, products, authorizations };
}

/**
 * Helper: Create seller user
 */
async function createSeller(
  userRepo: any,
  data: { username: string; email: string; name: string; hasSellerRole: boolean }
): Promise<User> {
  const existing = await userRepo.findOne({ where: { username: data.username } });
  if (existing) {
    console.log(`  ⏭️  Seller '${data.username}' already exists, skipping...`);
    return existing;
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = userRepo.create({
    username: data.username,
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: data.hasSellerRole ? 'seller' : 'user',
  });

  await userRepo.save(user);
  console.log(`  ✓ Created seller: ${data.name} (${data.username})`);
  return user;
}

/**
 * Helper: Create supplier
 */
async function createSupplier(
  supplierRepo: any,
  data: { name: string; code: string; contactEmail: string }
): Promise<Supplier> {
  const existing = await supplierRepo.findOne({ where: { code: data.code } });
  if (existing) {
    console.log(`  ⏭️  Supplier '${data.code}' already exists, skipping...`);
    return existing;
  }

  const supplier = supplierRepo.create({
    name: data.name,
    code: data.code,
    contactEmail: data.contactEmail,
    status: 'active',
  });

  await supplierRepo.save(supplier);
  console.log(`  ✓ Created supplier: ${data.name} (${data.code})`);
  return supplier;
}

/**
 * Helper: Create product
 */
async function createProduct(
  productRepo: any,
  data: { name: string; sku: string; supplierId: string; price: number }
): Promise<Product> {
  const existing = await productRepo.findOne({ where: { sku: data.sku } });
  if (existing) {
    console.log(`  ⏭️  Product '${data.sku}' already exists, skipping...`);
    return existing;
  }

  const product = productRepo.create({
    name: data.name,
    sku: data.sku,
    supplierId: data.supplierId,
    price: data.price,
    status: 'active',
  });

  await productRepo.save(product);
  console.log(`  ✓ Created product: ${data.name} (${data.sku})`);
  return product;
}

/**
 * Helper: Create authorization with audit trail
 */
async function createAuthorization(
  authRepo: any,
  auditRepo: any,
  data: {
    sellerId: string;
    productId: string;
    supplierId: string;
    status: AuthorizationStatus;
    daysAgo: number;
    cooldownDays?: number;
    rejectionReason?: string;
    revocationReason?: string;
    metadata?: any;
  }
): Promise<SellerAuthorization> {
  const requestedAt = new Date(Date.now() - data.daysAgo * 86400000);

  const authorization = authRepo.create({
    sellerId: data.sellerId,
    productId: data.productId,
    supplierId: data.supplierId,
    status: data.status,
    requestedAt,
    metadata: data.metadata || {},
  });

  // Set timestamps based on status
  if (data.status === AuthorizationStatus.APPROVED) {
    authorization.approvedAt = new Date(requestedAt.getTime() + 3600000); // +1 hour
    authorization.approvedBy = 'supplier-admin';
  } else if (data.status === AuthorizationStatus.REJECTED) {
    authorization.rejectedAt = new Date(requestedAt.getTime() + 3600000);
    authorization.rejectedBy = 'supplier-admin';
    authorization.rejectionReason = data.rejectionReason;
    if (data.cooldownDays) {
      authorization.cooldownUntil = new Date(
        authorization.rejectedAt.getTime() + data.cooldownDays * 86400000
      );
    }
  } else if (data.status === AuthorizationStatus.REVOKED) {
    authorization.approvedAt = new Date(requestedAt.getTime() + 3600000);
    authorization.approvedBy = 'supplier-admin';
    authorization.revokedAt = new Date(requestedAt.getTime() + 7 * 86400000); // +7 days
    authorization.revokedBy = 'admin';
    authorization.revocationReason = data.revocationReason;
  } else if (data.status === AuthorizationStatus.CANCELLED) {
    authorization.cancelledAt = new Date(requestedAt.getTime() + 7200000); // +2 hours
  }

  await authRepo.save(authorization);

  // Create audit trail
  const auditLog = SellerAuthorizationAuditLog.createRequestLog(authorization, data.sellerId);
  await auditRepo.save(auditLog);

  if (data.status === AuthorizationStatus.APPROVED) {
    const approveLog = SellerAuthorizationAuditLog.createApprovalLog(
      authorization,
      'supplier-admin'
    );
    await auditRepo.save(approveLog);
  } else if (data.status === AuthorizationStatus.REJECTED) {
    const rejectLog = SellerAuthorizationAuditLog.createRejectionLog(
      authorization,
      'supplier-admin',
      data.rejectionReason || 'Rejected by supplier'
    );
    await auditRepo.save(rejectLog);
  } else if (data.status === AuthorizationStatus.REVOKED) {
    const approveLog = SellerAuthorizationAuditLog.createApprovalLog(
      authorization,
      'supplier-admin'
    );
    await auditRepo.save(approveLog);

    const revokeLog = SellerAuthorizationAuditLog.createRevocationLog(
      authorization,
      'admin',
      data.revocationReason || 'Revoked by admin'
    );
    await auditRepo.save(revokeLog);
  } else if (data.status === AuthorizationStatus.CANCELLED) {
    const cancelLog = SellerAuthorizationAuditLog.createCancellationLog(authorization, data.sellerId);
    await auditRepo.save(cancelLog);
  }

  console.log(
    `  ✓ Created ${data.status} authorization: Seller ${data.sellerId.slice(0, 8)}... → Product ${data.productId.slice(0, 8)}...`
  );

  return authorization;
}

/**
 * CLI execution
 */
if (require.main === module) {
  seedPhase9Authorization()
    .then(() => {
      console.log('✅ Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}
