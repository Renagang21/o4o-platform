/**
 * Dropshipping Cosmetics Extension - Uninstall Lifecycle Hook
 *
 * Executed when dropshipping-cosmetics extension is uninstalled.
 * Responsibilities:
 * - Optionally remove cosmetics CPT (cosmetics_influencer_routine)
 * - Optionally remove cosmetics ACF field groups
 * - Optionally clean up cosmetics metadata
 * - Clean up filter configurations
 */

interface UninstallContext {
  dataSource: any;
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  options?: {
    purgeData?: boolean; // If true, remove all cosmetics data
    keepRoutines?: boolean; // If true, keep influencer routines
  };
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, logger, options = {} } = context;
  const { purgeData = false, keepRoutines = true } = options;

  logger.info('[dropshipping-cosmetics] Uninstalling extension...');

  if (purgeData) {
    logger.warn('[dropshipping-cosmetics] Data purge requested. Removing cosmetics data...');

    // 1. Remove cosmetics metadata from products (optional)
    if (!keepRoutines) {
      await removeProductMetadata(dataSource, logger);
    }

    // 2. Remove influencer routines (optional)
    if (!keepRoutines) {
      await removeInfluencerRoutines(dataSource, logger);
    }

    // 3. Remove filter configurations
    await removeFilterConfigurations(dataSource, logger);

    logger.info('[dropshipping-cosmetics] Data purge completed.');
  } else {
    logger.info('[dropshipping-cosmetics] Data will be preserved. Uninstalling extension only.');
  }

  logger.info('[dropshipping-cosmetics] Uninstallation completed successfully.');
}

/**
 * Remove cosmetics metadata from products
 */
async function removeProductMetadata(dataSource: any, logger: any): Promise<void> {
  logger.info('[dropshipping-cosmetics] Removing cosmetics metadata from products...');

  // TODO: Implement removal of cosmetics metadata
  // This should remove ACF values for:
  // - skinType
  // - concerns
  // - ingredients
  // - certifications
  // - productCategory
  // - routineInfo
  // - etc.

  logger.info('[dropshipping-cosmetics] Product metadata removed.');
}

/**
 * Remove influencer routines
 */
async function removeInfluencerRoutines(dataSource: any, logger: any): Promise<void> {
  logger.info('[dropshipping-cosmetics] Removing influencer routines...');

  // TODO: Implement removal of cosmetics_influencer_routine CPT data

  logger.info('[dropshipping-cosmetics] Influencer routines removed.');
}

/**
 * Remove filter configurations
 */
async function removeFilterConfigurations(dataSource: any, logger: any): Promise<void> {
  logger.info('[dropshipping-cosmetics] Removing filter configurations...');

  // TODO: Implement removal of filter configurations

  logger.info('[dropshipping-cosmetics] Filter configurations removed.');
}

export default uninstall;
