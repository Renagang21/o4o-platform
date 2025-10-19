"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.closeDatabaseConnection = exports.checkDatabaseHealth = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
const RefreshToken_1 = require("../entities/RefreshToken");
const LoginAttempt_1 = require("../entities/LoginAttempt");
const PasswordResetToken_1 = require("../entities/PasswordResetToken");
const EmailVerificationToken_1 = require("../entities/EmailVerificationToken");
const ApprovalLog_1 = require("../entities/ApprovalLog");
const LinkedAccount_1 = require("../entities/LinkedAccount");
const AccountActivity_1 = require("../entities/AccountActivity");
const UserActivityLog_1 = require("../entities/UserActivityLog");
const Media_1 = require("../entities/Media");
const MediaFile_1 = require("../entities/MediaFile");
const MediaFolder_1 = require("../entities/MediaFolder");
const Category_1 = require("../entities/Category");
const Settings_1 = require("../entities/Settings");
const Theme_1 = require("../entities/Theme");
const FundingProject_1 = require("../entities/crowdfunding/FundingProject");
const FundingReward_1 = require("../entities/crowdfunding/FundingReward");
const FundingBacking_1 = require("../entities/crowdfunding/FundingBacking");
const BackerReward_1 = require("../entities/crowdfunding/BackerReward");
const FundingUpdate_1 = require("../entities/crowdfunding/FundingUpdate");
const ForumCategory_1 = require("../entities/ForumCategory");
const ForumComment_1 = require("../entities/ForumComment");
const ForumPost_1 = require("../entities/ForumPost");
const ForumTag_1 = require("../entities/ForumTag");
// Digital Signage entities
const SignageContent_1 = require("../entities/SignageContent");
const SignageSchedule_1 = require("../entities/SignageSchedule");
const Store_1 = require("../entities/Store");
const StorePlaylist_1 = require("../entities/StorePlaylist");
const PlaylistItem_1 = require("../entities/PlaylistItem");
const ScreenTemplate_1 = require("../entities/ScreenTemplate");
const ContentUsageLog_1 = require("../entities/ContentUsageLog");
const Post_1 = require("../entities/Post");
const Tag_1 = require("../entities/Tag");
const PostAutosave_1 = require("../entities/PostAutosave");
const Page_1 = require("../entities/Page");
const ReusableBlock_1 = require("../entities/ReusableBlock");
const BlockPattern_1 = require("../entities/BlockPattern");
const TemplatePart_1 = require("../entities/TemplatePart");
const Shipment_1 = require("../entities/Shipment");
const ShipmentTrackingHistory_1 = require("../entities/ShipmentTrackingHistory");
const SmtpSettings_1 = require("../entities/SmtpSettings");
const EmailLog_1 = require("../entities/EmailLog");
const CustomField_1 = require("../entities/CustomField");
const CustomPost_1 = require("../entities/CustomPost");
const CustomPostType_1 = require("../entities/CustomPostType");
// Menu System entities
const Menu_1 = require("../entities/Menu");
const MenuItem_1 = require("../entities/MenuItem");
const MenuLocation_1 = require("../entities/MenuLocation");
// AI Settings entity
const AISetting_1 = require("../entities/AISetting");
const AiSettings_1 = require("../entities/AiSettings");
// Cart and Order entities
const Cart_1 = require("../entities/Cart");
const CartItem_1 = require("../entities/CartItem");
const Order_1 = require("../entities/Order");
// Dropshipping entities
const Product_1 = require("../entities/Product");
const Supplier_1 = require("../entities/Supplier");
const Seller_1 = require("../entities/Seller");
const Partner_1 = require("../entities/Partner");
const SellerProduct_1 = require("../entities/SellerProduct");
const PartnerCommission_1 = require("../entities/PartnerCommission");
const BusinessInfo_1 = require("../entities/BusinessInfo");
// Form entities
const Form_1 = require("../entities/Form");
const FormSubmission_1 = require("../entities/FormSubmission");
const env_validator_1 = require("../utils/env-validator");
// 환경변수는 env-validator를 통해 가져옴
const DB_TYPE = env_validator_1.env.getString('DB_TYPE', 'postgres');
const NODE_ENV = env_validator_1.env.getString('NODE_ENV', 'development');
// SQLite 또는 PostgreSQL 설정
let dataSourceConfig;
if (DB_TYPE === 'sqlite') {
    const DB_DATABASE = env_validator_1.env.getString('DB_DATABASE', './data/o4o_dev.sqlite');
    dataSourceConfig = {
        type: 'sqlite',
        database: DB_DATABASE,
    };
}
else {
    // PostgreSQL 설정
    const DB_HOST = env_validator_1.env.getString('DB_HOST');
    const DB_PORT = env_validator_1.env.getNumber('DB_PORT');
    const DB_USERNAME = env_validator_1.env.getString('DB_USERNAME');
    const DB_PASSWORD = env_validator_1.env.getString('DB_PASSWORD');
    const DB_NAME = env_validator_1.env.getString('DB_NAME');
    dataSourceConfig = {
        type: 'postgres',
        host: DB_HOST,
        port: DB_PORT,
        username: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_NAME,
    };
}
// TypeORM 데이터소스 설정
exports.AppDataSource = new typeorm_1.DataSource({
    ...dataSourceConfig,
    // NamingStrategy 설정 - 주석 처리 (데이터베이스가 이미 camelCase 사용)
    // namingStrategy: new SnakeNamingStrategy(),
    // 프로덕션 환경 설정
    synchronize: false, // 프로덕션에서는 항상 false
    logging: ['error'], // 프로덕션에서는 에러만 로깅
    // 연결 풀 설정 (PostgreSQL에서만 사용)
    ...(DB_TYPE === 'postgres' ? {
        extra: {
            max: 20, // 최대 연결 수
            min: 5, // 최소 연결 수
            idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
            connectionTimeoutMillis: 2000, // 연결 타임아웃
        }
    } : {}),
    // 엔티티 등록 - 모든 환경에서 명시적 엔티티 배열 사용
    entities: [
        User_1.User,
        Role_1.Role,
        Permission_1.Permission,
        RefreshToken_1.RefreshToken,
        LoginAttempt_1.LoginAttempt,
        PasswordResetToken_1.PasswordResetToken,
        EmailVerificationToken_1.EmailVerificationToken,
        ApprovalLog_1.ApprovalLog,
        LinkedAccount_1.LinkedAccount,
        AccountActivity_1.AccountActivity,
        UserActivityLog_1.UserActivityLog,
        Media_1.Media,
        MediaFile_1.MediaFile,
        MediaFolder_1.MediaFolder,
        Category_1.Category,
        Settings_1.Settings,
        Theme_1.Theme,
        Theme_1.ThemeInstallation,
        // Crowdfunding entities
        FundingProject_1.FundingProject,
        FundingReward_1.FundingReward,
        FundingBacking_1.FundingBacking,
        BackerReward_1.BackerReward,
        FundingUpdate_1.FundingUpdate,
        // Forum entities
        ForumCategory_1.ForumCategory,
        ForumPost_1.ForumPost,
        ForumComment_1.ForumComment,
        ForumTag_1.ForumTag,
        // Digital Signage entities
        SignageContent_1.SignageContent,
        SignageSchedule_1.SignageSchedule,
        Store_1.Store,
        StorePlaylist_1.StorePlaylist,
        PlaylistItem_1.PlaylistItem,
        ScreenTemplate_1.ScreenTemplate,
        ContentUsageLog_1.ContentUsageLog,
        // Content entities
        Post_1.Post,
        PostAutosave_1.PostAutosave,
        Tag_1.Tag,
        Page_1.Page,
        ReusableBlock_1.ReusableBlock,
        BlockPattern_1.BlockPattern,
        TemplatePart_1.TemplatePart,
        Shipment_1.Shipment,
        ShipmentTrackingHistory_1.ShipmentTrackingHistory,
        SmtpSettings_1.SmtpSettings,
        EmailLog_1.EmailLog,
        CustomField_1.FieldGroup,
        CustomField_1.CustomField,
        CustomField_1.CustomFieldValue,
        CustomPost_1.CustomPost,
        CustomPostType_1.CustomPostType,
        // Menu System entities
        Menu_1.Menu,
        MenuItem_1.MenuItem,
        MenuLocation_1.MenuLocation,
        // AI Settings
        AISetting_1.AISetting,
        AiSettings_1.AiSettings,
        // Cart and Order entities
        Cart_1.Cart,
        CartItem_1.CartItem,
        Order_1.Order,
        // Dropshipping entities
        Product_1.Product,
        Supplier_1.Supplier,
        Seller_1.Seller,
        Partner_1.Partner,
        SellerProduct_1.SellerProduct,
        PartnerCommission_1.PartnerCommission,
        BusinessInfo_1.BusinessInfo,
        // Form entities
        Form_1.Form,
        FormSubmission_1.FormSubmission,
    ],
    // 마이그레이션 설정
    migrations: NODE_ENV === 'production'
        ? ['dist/database/migrations/*.js']
        : [__dirname + '/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: false, // 자동 마이그레이션 비활성화 (수동 실행)
    // SSL 설정 (PostgreSQL 프로덕션 환경에서만)
    ...(DB_TYPE === 'postgres' && NODE_ENV === 'production' ? {
        ssl: {
            rejectUnauthorized: false
        }
    } : {}),
    // 캐시 설정 (PostgreSQL에서만)
    ...(DB_TYPE === 'postgres' ? {
        cache: {
            type: 'database',
            tableName: 'typeorm_query_cache',
            duration: 30000 // 30초 캐시
        }
    } : {})
});
// 데이터베이스 연결 상태 모니터링
// 주의: main.ts에서 초기화하므로 여기서는 자동 초기화하지 않음
// PM2 클러스터 모드에서 중복 초기화 방지
/*
AppDataSource.initialize()
  .then(() => {
  })
  .catch((error) => {
    // Error log removed
  });
*/
// 데이터베이스 헬스 체크 함수
async function checkDatabaseHealth() {
    var _a, _b;
    try {
        if (!exports.AppDataSource.isInitialized) {
            return { status: 'disconnected', error: 'DataSource not initialized' };
        }
        // 간단한 쿼리로 연결 상태 확인
        await exports.AppDataSource.query('SELECT 1');
        const connectionInfo = {
            status: 'connected',
            timestamp: new Date().toISOString()
        };
        if (DB_TYPE === 'sqlite') {
            connectionInfo.type = 'sqlite';
            connectionInfo.database = dataSourceConfig.database;
        }
        else {
            connectionInfo.type = 'postgres';
            connectionInfo.host = dataSourceConfig.host;
            connectionInfo.port = dataSourceConfig.port;
            connectionInfo.database = dataSourceConfig.database;
            connectionInfo.connectionCount = ((_b = (_a = exports.AppDataSource.driver) === null || _a === void 0 ? void 0 : _a.pool) === null || _b === void 0 ? void 0 : _b.size) || 0;
            connectionInfo.maxConnections = 20;
        }
        return connectionInfo;
    }
    catch (error) {
        return {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
exports.checkDatabaseHealth = checkDatabaseHealth;
// 데이터베이스 정리 함수 (종료 시 사용)
async function closeDatabaseConnection() {
    try {
        if (exports.AppDataSource.isInitialized) {
            await exports.AppDataSource.destroy();
        }
    }
    catch (error) {
        // Error log removed
    }
}
exports.closeDatabaseConnection = closeDatabaseConnection;
// initializeDatabase function for backward compatibility
const initializeDatabase = () => exports.AppDataSource.initialize();
exports.initializeDatabase = initializeDatabase;
// TypeORM CLI를 위한 default export
exports.default = exports.AppDataSource;
//# sourceMappingURL=connection.js.map