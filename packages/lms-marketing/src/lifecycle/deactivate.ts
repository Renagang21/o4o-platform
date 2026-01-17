/**
 * LMS Marketing Extension - Deactivation Hook
 */

export interface DeactivateContext {
  logger?: Console;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger = console } = context;

  logger.log('[lms-marketing] Deactivating extension...');

  // Cleanup any resources if needed
  logger.log('[lms-marketing] Extension deactivated successfully');
}

export default deactivate;
