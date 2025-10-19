"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const RefreshToken_1 = require("../entities/RefreshToken");
const PasswordResetToken_1 = require("../entities/PasswordResetToken");
const EmailVerificationToken_1 = require("../entities/EmailVerificationToken");
const ApprovalLog_1 = require("../entities/ApprovalLog");
const LinkedAccount_1 = require("../entities/LinkedAccount");
const AccountActivity_1 = require("../entities/AccountActivity");
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
const SignageContent_1 = require("../entities/SignageContent");
const SignageSchedule_1 = require("../entities/SignageSchedule");
const Store_1 = require("../entities/Store");
const StorePlaylist_1 = require("../entities/StorePlaylist");
const PlaylistItem_1 = require("../entities/PlaylistItem");
const ScreenTemplate_1 = require("../entities/ScreenTemplate");
const ContentUsageLog_1 = require("../entities/ContentUsageLog");
const Post_1 = require("../entities/Post");
// import { PostTag } from '../entities/PostTag'; // Entity does not exist
const Page_1 = require("../entities/Page");
const ReusableBlock_1 = require("../entities/ReusableBlock");
const BlockPattern_1 = require("../entities/BlockPattern");
const TemplatePart_1 = require("../entities/TemplatePart");
const Shipment_1 = require("../entities/Shipment");
const ShipmentTrackingHistory_1 = require("../entities/ShipmentTrackingHistory");
const SmtpSettings_1 = require("../entities/SmtpSettings");
const EmailLog_1 = require("../entities/EmailLog");
const CustomField_1 = require("../entities/CustomField");
const Menu_1 = require("../entities/Menu");
const MenuItem_1 = require("../entities/MenuItem");
const MenuLocation_1 = require("../entities/MenuLocation");
const CustomPostType_1 = require("../entities/CustomPostType");
// 환경변수 기본값 설정
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = String(process.env.DB_PASSWORD || '');
const DB_NAME = process.env.DB_NAME || 'o4o_platform';
const NODE_ENV = process.env.NODE_ENV || 'development';
// TypeORM CLI 전용 DataSource
const CLIDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    synchronize: false,
    logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    entities: [
        User_1.User,
        RefreshToken_1.RefreshToken,
        PasswordResetToken_1.PasswordResetToken,
        EmailVerificationToken_1.EmailVerificationToken,
        ApprovalLog_1.ApprovalLog,
        LinkedAccount_1.LinkedAccount,
        AccountActivity_1.AccountActivity,
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
        // PostTag, // Entity does not exist
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
        // Menu System entities
        Menu_1.Menu,
        MenuItem_1.MenuItem,
        MenuLocation_1.MenuLocation,
        // CPT entity
        CustomPostType_1.CustomPostType,
    ],
    migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations'
});
exports.default = CLIDataSource;
//# sourceMappingURL=cli-config.js.map