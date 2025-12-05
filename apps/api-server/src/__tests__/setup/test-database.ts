/**
 * Test Database Setup
 * Phase B-4 Step 9 - SQLite in-memory database for integration tests
 */

import { DataSource } from 'typeorm';
// AUTH Module entities - following connection.ts pattern
import { User } from '../../modules/auth/entities/User.js';
import { Role } from '../../modules/auth/entities/Role.js';
import { Permission } from '../../modules/auth/entities/Permission.js';
import { RoleAssignment } from '../../modules/auth/entities/RoleAssignment.js';
import { RefreshToken } from '../../modules/auth/entities/RefreshToken.js';
import { LoginAttempt } from '../../modules/auth/entities/LoginAttempt.js';
import { LinkingSession } from '../../modules/auth/entities/LinkingSession.js';
// Legacy entities
import { ApprovalLog } from '../../entities/ApprovalLog.js';
import { LinkedAccount } from '../../entities/LinkedAccount.js';
import { AccountActivity } from '../../entities/AccountActivity.js';
import { Notification } from '../../entities/Notification.js';
import { Category } from '../../entities/Category.js';
// Commerce entities
import { Order } from '../../modules/commerce/entities/Order.js';
import { OrderItem } from '../../modules/commerce/entities/OrderItem.js';
import { OrderEvent } from '../../entities/OrderEvent.js';
import { Product } from '../../modules/commerce/entities/Product.js';
// Dropshipping entities
import { Settlement } from '../../modules/dropshipping/entities/Settlement.js';
import { SettlementItem } from '../../modules/dropshipping/entities/SettlementItem.js';
import { Seller } from '../../modules/dropshipping/entities/Seller.js';
import { Supplier } from '../../modules/dropshipping/entities/Supplier.js';
import { SellerProduct } from '../../modules/dropshipping/entities/SellerProduct.js';
import { SellerAuthorization } from '../../modules/dropshipping/entities/SellerAuthorization.js';
import { Partner } from '../../modules/dropshipping/entities/Partner.js';
import { PartnerCommission } from '../../modules/dropshipping/entities/PartnerCommission.js';
import { Commission } from '../../modules/dropshipping/entities/Commission.js';

let testDataSource: DataSource | null = null;

/**
 * Initialize test database (SQLite in-memory)
 */
export async function initializeTestDatabase(): Promise<DataSource> {
  if (testDataSource && testDataSource.isInitialized) {
    return testDataSource;
  }

  testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities: [
      // Auth entities
      User,
      Role,
      Permission,
      RoleAssignment,
      RefreshToken,
      LoginAttempt,
      LinkingSession,
      // Legacy entities
      ApprovalLog,
      LinkedAccount,
      AccountActivity,
      Notification,
      Category,
      // Commerce entities
      Order,
      OrderItem,
      OrderEvent,
      Product,
      // Dropshipping entities
      Settlement,
      SettlementItem,
      Seller,
      Supplier,
      SellerProduct,
      SellerAuthorization,
      Partner,
      PartnerCommission,
      Commission
    ]
  });

  await testDataSource.initialize();
  return testDataSource;
}

/**
 * Close test database
 */
export async function closeTestDatabase(): Promise<void> {
  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
    testDataSource = null;
  }
}

/**
 * Clear all data from test database
 */
export async function clearTestDatabase(): Promise<void> {
  if (!testDataSource || !testDataSource.isInitialized) {
    return;
  }

  const entities = testDataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.query(`DELETE FROM ${entity.tableName}`);
  }
}

/**
 * Get test data source
 */
export function getTestDataSource(): DataSource {
  if (!testDataSource || !testDataSource.isInitialized) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  return testDataSource;
}
