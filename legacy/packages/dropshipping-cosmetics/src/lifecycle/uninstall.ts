import type { UninstallContext } from '@o4o/types';

/**
 * Cosmetics Extension - Uninstall Hook
 *
 * Executed when the cosmetics extension is uninstalled.
 *
 * SAFETY: By default, cosmetics metadata is KEPT in Product.metadata.
 * Only purge if explicitly requested.
 */
export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, logger, options = {} } = context;
  const { purgeData = false } = options;

  logger.info('[cosmetics-extension] Uninstalling...');

  if (purgeData) {
    logger.warn('[cosmetics-extension] PURGE MODE - Removing cosmetics metadata from products!');

    try {
      const productRepo = dataSource.getRepository('Product');

      // Find all cosmetics products
      const cosmeticsProducts = await productRepo
        .createQueryBuilder('product')
        .where("product.metadata->>'productType' = :productType", { productType: 'cosmetics' })
        .getMany();

      logger.info(`[cosmetics-extension] Found ${cosmeticsProducts.length} cosmetics products`);

      // Remove cosmetics metadata (but keep the product)
      for (const product of cosmeticsProducts) {
        if (product.metadata) {
          delete (product.metadata as any).cosmetics;
          delete (product.metadata as any).productType;
          await productRepo.save(product);
        }
      }

      logger.info(`[cosmetics-extension] Removed cosmetics metadata from ${cosmeticsProducts.length} products`);
    } catch (error) {
      logger.error('[cosmetics-extension] Error purging cosmetics data:', error);
      throw error;
    }
  } else {
    logger.info('[cosmetics-extension] Keep-data mode - Cosmetics metadata will be preserved');
  }

  logger.info('[cosmetics-extension] Uninstallation completed successfully');
}

export default uninstall;
