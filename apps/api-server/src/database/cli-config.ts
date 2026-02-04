/**
 * @deprecated This file is replaced by migration-config.ts for production.
 *
 * This CLI config imports entities which causes bundling issues with tsup.
 * Use migration-config.ts instead - it's a lightweight DataSource without entity imports.
 *
 * Production command:
 *   npx typeorm migration:run -d dist/database/migration-config.js
 *
 * This file is kept for backward compatibility with local development workflows.
 */
import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { RefreshToken } from '../entities/RefreshToken.js';
import { PasswordResetToken } from '../entities/PasswordResetToken.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
// MediaFile/MediaFolder removed - legacy CMS
import { Category } from '../entities/Category.js';
import { Settings } from '../entities/Settings.js';
import { Theme, ThemeInstallation } from '../entities/Theme.js';
// Post/Page removed - legacy WP-style CMS
import { ReusableBlock } from '../entities/ReusableBlock.js';
import { BlockPattern } from '../entities/BlockPattern.js';
import { TemplatePart } from '../entities/TemplatePart.js';
// Shipment removed - legacy commerce
import { SmtpSettings } from '../entities/SmtpSettings.js';
import { EmailLog } from '../entities/EmailLog.js';
import { OperatorNotificationSettings } from '../entities/OperatorNotificationSettings.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
// Menu removed - legacy CMS
import { CustomPostType } from '../entities/CustomPostType.js';

// 환경변수 기본값 설정
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = String(process.env.DB_PASSWORD || '');
const DB_NAME = process.env.DB_NAME || 'o4o_platform';
const NODE_ENV = process.env.NODE_ENV || 'development';

// TypeORM CLI 전용 DataSource
const CLIDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,

  synchronize: false,
  logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  entities: [
    User,
    RefreshToken,
    PasswordResetToken,
    EmailVerificationToken,
    ApprovalLog,
    LinkedAccount,
    AccountActivity,
    // MediaFile/MediaFolder removed
    Category,
    Settings,
    Theme,
    ThemeInstallation,
    // Content entities - Post/Page removed
    ReusableBlock,
    BlockPattern,
    TemplatePart,
    // Shipment/ShipmentTrackingHistory removed
    SmtpSettings,
    EmailLog,
    OperatorNotificationSettings,
    FieldGroup,
    CustomField,
    CustomFieldValue,
    // Menu System entities removed
    // CPT entity
    CustomPostType,
  ],

  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations'
});

export default CLIDataSource;
