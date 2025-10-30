import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { RefreshToken } from '../entities/RefreshToken.js';
import { PasswordResetToken } from '../entities/PasswordResetToken.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import { MediaFile } from '../entities/MediaFile.js';
import { MediaFolder } from '../entities/MediaFolder.js';
import { Category } from '../entities/Category.js';
import { Settings } from '../entities/Settings.js';
import { Theme, ThemeInstallation } from '../entities/Theme.js';
import { FundingProject } from '../entities/crowdfunding/FundingProject.js';
import { FundingReward } from '../entities/crowdfunding/FundingReward.js';
import { FundingBacking } from '../entities/crowdfunding/FundingBacking.js';
import { BackerReward } from '../entities/crowdfunding/BackerReward.js';
import { FundingUpdate } from '../entities/crowdfunding/FundingUpdate.js';
import { ForumCategory } from '../entities/ForumCategory.js';
import { ForumComment } from '../entities/ForumComment.js';
import { ForumPost } from '../entities/ForumPost.js';
import { ForumTag } from '../entities/ForumTag.js';
import { SignageContent } from '../entities/SignageContent.js';
import { SignageSchedule } from '../entities/SignageSchedule.js';
import { Store } from '../entities/Store.js';
import { StorePlaylist } from '../entities/StorePlaylist.js';
import { PlaylistItem } from '../entities/PlaylistItem.js';
import { ScreenTemplate } from '../entities/ScreenTemplate.js';
import { ContentUsageLog } from '../entities/ContentUsageLog.js';
import { Post } from '../entities/Post.js';
// import { PostTag } from '../entities/PostTag.js'; // Entity does not exist
import { Page } from '../entities/Page.js';
import { ReusableBlock } from '../entities/ReusableBlock.js';
import { BlockPattern } from '../entities/BlockPattern.js';
import { TemplatePart } from '../entities/TemplatePart.js';
import { Shipment } from '../entities/Shipment.js';
import { ShipmentTrackingHistory } from '../entities/ShipmentTrackingHistory.js';
import { SmtpSettings } from '../entities/SmtpSettings.js';
import { EmailLog } from '../entities/EmailLog.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
import { Menu } from '../entities/Menu.js';
import { MenuItem } from '../entities/MenuItem.js';
import { MenuLocation } from '../entities/MenuLocation.js';
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
    MediaFile,
    MediaFolder,
    Category,
    Settings,
    Theme,
    ThemeInstallation,
    // Crowdfunding entities
    FundingProject,
    FundingReward,
    FundingBacking,
    BackerReward,
    FundingUpdate,
    // Forum entities
    ForumCategory,
    ForumPost,
    ForumComment,
    ForumTag,
    // Digital Signage entities
    SignageContent,
    SignageSchedule,
    Store,
    StorePlaylist,
    PlaylistItem,
    ScreenTemplate,
    ContentUsageLog,
    // Content entities
    Post,
    // PostTag, // Entity does not exist
    Page,
    ReusableBlock,
    BlockPattern,
    TemplatePart,
    Shipment,
    ShipmentTrackingHistory,
    SmtpSettings,
    EmailLog,
    FieldGroup,
    CustomField,
    CustomFieldValue,
    // Menu System entities
    Menu,
    MenuItem,
    MenuLocation,
    // CPT entity
    CustomPostType,
  ],
  
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations'
});

export default CLIDataSource;