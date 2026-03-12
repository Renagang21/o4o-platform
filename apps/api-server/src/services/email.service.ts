// Email Service — thin wrapper around @o4o/mail-core
// Provides api-server's AppDataSource and logger to MailService

import { MailService } from '@o4o/mail-core';
import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

// Create singleton with api-server dependencies
export const emailService = new MailService({
  dataSource: AppDataSource,
  logger,
});

// Re-export class for backward compatibility (EmailService → MailService)
export { MailService as EmailService } from '@o4o/mail-core';
