"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserActivityController = void 0;
const data_source_1 = __importDefault(require("../../database/data-source"));
const UserActivityLog_1 = require("../../entities/UserActivityLog");
const User_1 = require("../../entities/User");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
class UserActivityController {
    static async getUserActivityLog(req, res) {
        try {
            const { id: userId } = req.params;
            const { page = '1', limit = '20', category, type, startDate, endDate, includeSystemGenerated = 'true' } = req.query;
            const user = await UserActivityController.userRepository.findOne({
                where: { id: userId }
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const offset = (pageNum - 1) * limitNum;
            const whereConditions = { userId };
            if (category && Object.values(UserActivityLog_1.ActivityCategory).includes(category)) {
                whereConditions.activityCategory = category;
            }
            if (type && Object.values(UserActivityLog_1.ActivityType).includes(type)) {
                whereConditions.activityType = type;
            }
            if (includeSystemGenerated === 'false') {
                whereConditions.isSystemGenerated = false;
            }
            if (startDate && endDate) {
                whereConditions.createdAt = (0, typeorm_1.Between)(new Date(startDate), new Date(endDate));
            }
            else if (startDate) {
                whereConditions.createdAt = (0, typeorm_1.Between)(new Date(startDate), new Date());
            }
            const findOptions = {
                where: whereConditions,
                relations: ['performedBy'],
                order: { createdAt: 'DESC' },
                skip: offset,
                take: limitNum
            };
            const [activities, total] = await UserActivityController.userActivityRepository.findAndCount(findOptions);
            const totalPages = Math.ceil(total / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            res.status(200).json({
                success: true,
                data: {
                    activities: activities.map(activity => ({
                        id: activity.id,
                        activityType: activity.activityType,
                        activityCategory: activity.activityCategory,
                        title: activity.getDisplayTitle(),
                        description: activity.getDisplayDescription(),
                        ipAddress: activity.ipAddress,
                        userAgent: activity.userAgent,
                        metadata: activity.metadata,
                        isSystemGenerated: activity.isSystemGenerated,
                        isSecurityRelated: activity.isSecurityRelated(),
                        isAdminAction: activity.isAdminAction(),
                        performedBy: activity.performedBy ? {
                            id: activity.performedBy.id,
                            email: activity.performedBy.email,
                            firstName: activity.performedBy.firstName,
                            lastName: activity.performedBy.lastName
                        } : null,
                        createdAt: activity.createdAt
                    })),
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage,
                        hasPrevPage
                    }
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async createUserActivity(req, res) {
        var _a;
        try {
            const { id: userId } = req.params;
            const { activityType, title, description, metadata, ipAddress, userAgent } = req.body;
            const user = await UserActivityController.userRepository.findOne({
                where: { id: userId }
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            if (!Object.values(UserActivityLog_1.ActivityType).includes(activityType)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid activity type'
                });
                return;
            }
            let activityCategory;
            if (activityType.includes('login') || activityType.includes('logout') || activityType.includes('password')) {
                activityCategory = UserActivityLog_1.ActivityCategory.AUTHENTICATION;
            }
            else if (activityType.includes('profile') || activityType.includes('avatar')) {
                activityCategory = UserActivityLog_1.ActivityCategory.PROFILE;
            }
            else if (activityType.includes('admin') || activityType.includes('role') || activityType.includes('permission')) {
                activityCategory = UserActivityLog_1.ActivityCategory.ADMIN;
            }
            else if (activityType.includes('two_factor') || activityType.includes('api_key')) {
                activityCategory = UserActivityLog_1.ActivityCategory.SECURITY;
            }
            else {
                activityCategory = UserActivityLog_1.ActivityCategory.SYSTEM;
            }
            const activity = UserActivityController.userActivityRepository.create({
                userId,
                activityType,
                activityCategory,
                title,
                description,
                metadata,
                ipAddress: ipAddress || req.ip,
                userAgent: userAgent || req.get('User-Agent'),
                isSystemGenerated: false,
                performedByUserId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
            });
            const errors = await (0, class_validator_1.validate)(activity);
            if (errors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.map(err => ({
                        property: err.property,
                        constraints: err.constraints
                    }))
                });
                return;
            }
            const savedActivity = await UserActivityController.userActivityRepository.save(activity);
            res.status(201).json({
                success: true,
                data: {
                    id: savedActivity.id,
                    activityType: savedActivity.activityType,
                    activityCategory: savedActivity.activityCategory,
                    title: savedActivity.getDisplayTitle(),
                    description: savedActivity.getDisplayDescription(),
                    createdAt: savedActivity.createdAt
                },
                message: 'Activity logged successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async getActivityCategories(req, res) {
        try {
            const categories = Object.values(UserActivityLog_1.ActivityCategory).map(category => ({
                value: category,
                label: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
            }));
            res.status(200).json({
                success: true,
                data: categories
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async getActivityTypes(req, res) {
        try {
            const { category } = req.query;
            let types = Object.values(UserActivityLog_1.ActivityType);
            if (category && Object.values(UserActivityLog_1.ActivityCategory).includes(category)) {
                const categoryTypes = {
                    [UserActivityLog_1.ActivityCategory.AUTHENTICATION]: [
                        UserActivityLog_1.ActivityType.LOGIN,
                        UserActivityLog_1.ActivityType.LOGOUT,
                        UserActivityLog_1.ActivityType.PASSWORD_CHANGE,
                        UserActivityLog_1.ActivityType.EMAIL_CHANGE
                    ],
                    [UserActivityLog_1.ActivityCategory.PROFILE]: [
                        UserActivityLog_1.ActivityType.PROFILE_UPDATE,
                        UserActivityLog_1.ActivityType.AVATAR_UPDATE,
                        UserActivityLog_1.ActivityType.BUSINESS_INFO_UPDATE
                    ],
                    [UserActivityLog_1.ActivityCategory.SECURITY]: [
                        UserActivityLog_1.ActivityType.PASSWORD_RESET_REQUEST,
                        UserActivityLog_1.ActivityType.PASSWORD_RESET_COMPLETE,
                        UserActivityLog_1.ActivityType.TWO_FACTOR_ENABLE,
                        UserActivityLog_1.ActivityType.TWO_FACTOR_DISABLE,
                        UserActivityLog_1.ActivityType.API_KEY_CREATE,
                        UserActivityLog_1.ActivityType.API_KEY_DELETE,
                        UserActivityLog_1.ActivityType.API_ACCESS_DENIED
                    ],
                    [UserActivityLog_1.ActivityCategory.ADMIN]: [
                        UserActivityLog_1.ActivityType.ROLE_CHANGE,
                        UserActivityLog_1.ActivityType.PERMISSION_GRANT,
                        UserActivityLog_1.ActivityType.PERMISSION_REVOKE,
                        UserActivityLog_1.ActivityType.ADMIN_APPROVAL,
                        UserActivityLog_1.ActivityType.ADMIN_REJECTION,
                        UserActivityLog_1.ActivityType.ADMIN_NOTE_ADD,
                        UserActivityLog_1.ActivityType.ACCOUNT_ACTIVATION,
                        UserActivityLog_1.ActivityType.ACCOUNT_DEACTIVATION,
                        UserActivityLog_1.ActivityType.ACCOUNT_SUSPENSION,
                        UserActivityLog_1.ActivityType.ACCOUNT_UNSUSPENSION
                    ],
                    [UserActivityLog_1.ActivityCategory.SYSTEM]: [
                        UserActivityLog_1.ActivityType.EMAIL_VERIFICATION,
                        UserActivityLog_1.ActivityType.DATA_EXPORT,
                        UserActivityLog_1.ActivityType.DATA_DELETION,
                        UserActivityLog_1.ActivityType.GDPR_REQUEST
                    ]
                };
                types = categoryTypes[category] || types;
            }
            const typesWithLabels = types.map(type => ({
                value: type,
                label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            }));
            res.status(200).json({
                success: true,
                data: typesWithLabels
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    static async getActivitySummary(req, res) {
        try {
            const { id: userId } = req.params;
            const { days = '30' } = req.query;
            const user = await UserActivityController.userRepository.findOne({
                where: { id: userId }
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }
            const daysNum = parseInt(days, 10);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysNum);
            const activities = await UserActivityController.userActivityRepository.find({
                where: {
                    userId,
                    createdAt: (0, typeorm_1.Between)(startDate, new Date())
                }
            });
            const summary = {
                totalActivities: activities.length,
                securityRelated: activities.filter(a => {
                    const temp = new UserActivityLog_1.UserActivityLog();
                    temp.activityType = a.activityType;
                    return temp.isSecurityRelated();
                }).length,
                adminActions: activities.filter(a => a.isAdminAction()).length,
                systemGenerated: activities.filter(a => a.isSystemGenerated).length,
                byCategory: Object.values(UserActivityLog_1.ActivityCategory).reduce((acc, category) => {
                    acc[category] = activities.filter(a => a.activityCategory === category).length;
                    return acc;
                }, {}),
                recentActivity: activities
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .slice(0, 5)
                    .map(activity => ({
                    id: activity.id,
                    type: activity.activityType,
                    title: activity.title,
                    createdAt: activity.createdAt
                }))
            };
            res.status(200).json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.UserActivityController = UserActivityController;
UserActivityController.userActivityRepository = data_source_1.default.getRepository(UserActivityLog_1.UserActivityLog);
UserActivityController.userRepository = data_source_1.default.getRepository(User_1.User);
//# sourceMappingURL=userActivity.controller.js.map