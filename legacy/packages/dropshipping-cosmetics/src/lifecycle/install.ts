import type { InstallContext } from '@o4o/types';

/**
 * Cosmetics Extension - Install Hook
 *
 * Executed when the cosmetics extension is installed.
 * This extension doesn't create new tables - it only extends existing Product metadata.
 */
export async function install(context: InstallContext): Promise<void> {
  const { dataSource, logger, options = {} } = context;

  logger.info('[cosmetics-extension] Installing...');

  try {
    // Check if dropshipping-core is installed
    const productRepo = dataSource.getRepository('Product');
    const productCount = await productRepo.count();

    logger.info(`[cosmetics-extension] Found ${productCount} products in database`);

    // Check if there are any cosmetics products
    const cosmeticsCount = await productRepo
      .createQueryBuilder('product')
      .where("product.metadata->>'productType' = :productType", { productType: 'cosmetics' })
      .getCount();

    logger.info(`[cosmetics-extension] Found ${cosmeticsCount} cosmetics products`);

    // No database schema changes needed - cosmetics data is stored in Product.metadata
    logger.info('[cosmetics-extension] No schema changes required - using metadata JSONB field');

    // Optionally seed sample data if requested
    if (options.seedData) {
      logger.info('[cosmetics-extension] Seeding sample cosmetics data...');
      await seedSampleData(dataSource, logger);
    }

    logger.info('[cosmetics-extension] Installation completed successfully');
  } catch (error) {
    logger.error('[cosmetics-extension] Installation failed:', error);
    throw error;
  }
}

/**
 * Seed sample cosmetics data (optional)
 */
async function seedSampleData(dataSource: any, logger: any): Promise<void> {
  const productRepo = dataSource.getRepository('Product');

  const sampleProducts = [
    {
      name: '센텔라 진정 토너',
      description: '민감한 피부를 진정시키는 센텔라 토너',
      price: 25000,
      metadata: {
        productType: 'cosmetics',
        cosmetics: {
          skinType: ['oily', 'combination', 'sensitive'],
          concerns: ['acne', 'soothing', 'pore'],
          ingredients: [
            { name: '센텔라 아시아티카 추출물', description: '진정 효과', percentage: 10 },
            { name: '나이아신아마이드', description: '미백 및 모공 개선', percentage: 2 }
          ],
          certifications: ['hypoallergenic', 'dermatologicallyTested'],
          productCategory: 'skincare',
          routineInfo: {
            timeOfUse: ['morning', 'evening'],
            step: 'toner',
            orderInRoutine: 2
          },
          texture: 'water',
          volume: '200ml',
          expiryPeriod: '12개월'
        }
      }
    },
    {
      name: '저자극 폼 클렌저',
      description: '부드럽게 세안하는 약산성 클렌저',
      price: 18000,
      metadata: {
        productType: 'cosmetics',
        cosmetics: {
          skinType: ['dry', 'sensitive', 'normal'],
          concerns: ['soothing', 'moisturizing'],
          ingredients: [
            { name: '히알루론산', description: '보습', percentage: 5 },
            { name: '세라마이드', description: '피부 장벽 강화', percentage: 3 }
          ],
          certifications: ['hypoallergenic', 'vegan'],
          productCategory: 'cleansing',
          routineInfo: {
            timeOfUse: ['morning', 'evening'],
            step: 'cleansing',
            orderInRoutine: 1
          },
          texture: 'foam',
          volume: '150ml',
          expiryPeriod: '12개월'
        }
      }
    }
  ];

  for (const productData of sampleProducts) {
    const existing = await productRepo.findOne({ where: { name: productData.name } });
    if (!existing) {
      await productRepo.save(productData);
      logger.info(`[cosmetics-extension] Created sample product: ${productData.name}`);
    }
  }
}

export default install;
