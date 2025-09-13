import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';
import { ApprovalLog } from '../entities/ApprovalLog';
import { LinkedAccount } from '../entities/LinkedAccount';
import { AccountActivity } from '../entities/AccountActivity';
import { MediaFile } from '../entities/MediaFile';
import { MediaFolder } from '../entities/MediaFolder';
import { Product } from '../entities/Product';
import { ProductAttribute } from '../entities/ProductAttribute';
import { ProductAttributeValue } from '../entities/ProductAttributeValue';
import { ProductVariation } from '../entities/ProductVariation';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Category } from '../entities/Category';
import { Settings } from '../entities/Settings';
import { Coupon, CouponUsage } from '../entities/Coupon';
import { Theme, ThemeInstallation } from '../entities/Theme';
import { FundingProject } from '../entities/crowdfunding/FundingProject';
import { FundingReward } from '../entities/crowdfunding/FundingReward';
import { FundingBacking } from '../entities/crowdfunding/FundingBacking';
import { BackerReward } from '../entities/crowdfunding/BackerReward';
import { FundingUpdate } from '../entities/crowdfunding/FundingUpdate';
import { ForumCategory } from '../entities/ForumCategory';
import { ForumComment } from '../entities/ForumComment';
import { ForumPost } from '../entities/ForumPost';
import { ForumTag } from '../entities/ForumTag';
import { SignageContent } from '../entities/SignageContent';
import { SignageSchedule } from '../entities/SignageSchedule';
import { Store } from '../entities/Store';
import { StorePlaylist } from '../entities/StorePlaylist';
import { PlaylistItem } from '../entities/PlaylistItem';
import { ScreenTemplate } from '../entities/ScreenTemplate';
import { ContentUsageLog } from '../entities/ContentUsageLog';
import { Post } from '../entities/Post';
// import { PostTag } from '../entities/PostTag'; // Entity does not exist
import { Page } from '../entities/Page';
import { ReusableBlock } from '../entities/ReusableBlock';
import { BlockPattern } from '../entities/BlockPattern';
import { TemplatePart } from '../entities/TemplatePart';
import { Shipment } from '../entities/Shipment';
import { ShipmentTrackingHistory } from '../entities/ShipmentTrackingHistory';
import { SmtpSettings } from '../entities/SmtpSettings';
import { EmailLog } from '../entities/EmailLog';
import { Shortcode } from '../entities/Shortcode';
import { ShortcodeExecution } from '../entities/ShortcodeExecution';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField';
import { Supplier } from '../entities/dropshipping/Supplier';
import { Seller } from '../entities/dropshipping/Seller';
import { Affiliate } from '../entities/dropshipping/Affiliate';
import { DropshippingProduct } from '../entities/dropshipping/DropshippingProduct';
import { AffiliateUser } from '../entities/affiliate/AffiliateUser';
import { AffiliateClick } from '../entities/affiliate/AffiliateClick';
import { AffiliateConversion } from '../entities/affiliate/AffiliateConversion';
import { AffiliateCommission } from '../entities/affiliate/AffiliateCommission';
import { AffiliatePayout } from '../entities/affiliate/AffiliatePayout';
import { AffiliateAuditLog } from '../entities/affiliate/AffiliateAuditLog';
import { Menu } from '../entities/Menu';
import { MenuItem } from '../entities/MenuItem';
import { MenuLocation } from '../entities/MenuLocation';

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
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductVariation,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Category,
    Settings,
    Coupon,
    CouponUsage,
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
    Shortcode,
    ShortcodeExecution,
    FieldGroup,
    CustomField,
    CustomFieldValue,
    // Dropshipping entities
    Supplier,
    Seller,
    Affiliate,
    DropshippingProduct,
    // Affiliate Marketing entities
    AffiliateUser,
    AffiliateClick,
    AffiliateConversion,
    AffiliateCommission,
    AffiliatePayout,
    AffiliateAuditLog,
    // Menu System entities
    Menu,
    MenuItem,
    MenuLocation
  ],
  
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations'
});

export default CLIDataSource;