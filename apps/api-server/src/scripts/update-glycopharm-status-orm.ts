/**
 * Update Glycopharm Product Status using TypeORM
 * Updates glycopharm_products status to 'active' using the API server's DataSource
 *
 * WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1 (Task T3)
 *
 * Usage: npx tsx src/scripts/update-glycopharm-status-orm.ts
 */

import { DataSource } from 'typeorm';
import { GlycopharmProduct } from '../routes/glycopharm/entities/glycopharm-product.entity.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../.env.local') });

async function updateProductStatus() {
  console.log('🚀 Starting Glycopharm product status update via TypeORM...\n');

  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '34.64.96.252',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'o4o_api',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    synchronize: false,
    logging: true,
    entities: [GlycopharmProduct],
  });

  try {
    // Initialize DataSource
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Get repository
    const productRepo = dataSource.getRepository(GlycopharmProduct);

    // Get current status counts
    const totalCount = await productRepo.count();
    const activeCount = await productRepo.count({ where: { status: 'active' } });
    console.log(`📊 Current status:`);
    console.log(`   Total products: ${totalCount}`);
    console.log(`   Active products: ${activeCount}`);
    console.log(`   Non-active products: ${totalCount - activeCount}\n`);

    if (totalCount === activeCount) {
      console.log('✅ All products are already active. No update needed.\n');
      return;
    }

    // Update products
    console.log('⚙️  Updating products to active status...\n');
    const result = await productRepo
      .createQueryBuilder()
      .update(GlycopharmProduct)
      .set({ status: 'active', updated_at: new Date() })
      .where('status != :status', { status: 'active' })
      .execute();

    console.log(`✅ Updated ${result.affected} products to active status\n`);

    // Verify update
    const newActiveCount = await productRepo.count({ where: { status: 'active' } });
    console.log(`📊 Updated status:`);
    console.log(`   Total products: ${totalCount}`);
    console.log(`   Active products: ${newActiveCount}`);
    console.log(`   Non-active products: ${totalCount - newActiveCount}\n`);

    // List updated products
    console.log('📋 Updated products:');
    const products = await productRepo.find({
      order: { created_at: 'DESC' },
      take: 20,
    });

    products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (${p.sku}) - ${p.status} - ${p.manufacturer || 'N/A'}`);
    });

    console.log('\n🎉 Product status update completed successfully!');

  } catch (error) {
    console.error('\n❌ Update failed:');
    console.error(error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Run update
updateProductStatus().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
