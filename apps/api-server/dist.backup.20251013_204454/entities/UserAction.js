"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAction = exports.ActionCategory = exports.ActionType = void 0;
const typeorm_1 = require("typeorm");
const BetaUser_1 = require("./BetaUser");
const UserSession_1 = require("./UserSession");
var ActionType;
(function (ActionType) {
    // Navigation actions
    ActionType["PAGE_VIEW"] = "page_view";
    ActionType["NAVIGATION"] = "navigation";
    ActionType["MENU_CLICK"] = "menu_click";
    ActionType["SEARCH"] = "search";
    ActionType["FILTER"] = "filter";
    ActionType["SORT"] = "sort";
    // Content actions
    ActionType["CONTENT_VIEW"] = "content_view";
    ActionType["CONTENT_PLAY"] = "content_play";
    ActionType["CONTENT_PAUSE"] = "content_pause";
    ActionType["CONTENT_STOP"] = "content_stop";
    ActionType["CONTENT_SKIP"] = "content_skip";
    ActionType["CONTENT_DOWNLOAD"] = "content_download";
    ActionType["CONTENT_SHARE"] = "content_share";
    // Signage actions
    ActionType["SIGNAGE_CREATE"] = "signage_create";
    ActionType["SIGNAGE_EDIT"] = "signage_edit";
    ActionType["SIGNAGE_DELETE"] = "signage_delete";
    ActionType["SIGNAGE_PUBLISH"] = "signage_publish";
    ActionType["SIGNAGE_SCHEDULE"] = "signage_schedule";
    ActionType["PLAYLIST_CREATE"] = "playlist_create";
    ActionType["PLAYLIST_EDIT"] = "playlist_edit";
    ActionType["TEMPLATE_USE"] = "template_use";
    // User actions
    ActionType["LOGIN"] = "login";
    ActionType["LOGOUT"] = "logout";
    ActionType["PROFILE_UPDATE"] = "profile_update";
    ActionType["SETTINGS_CHANGE"] = "settings_change";
    ActionType["PREFERENCE_UPDATE"] = "preference_update";
    // Feedback actions
    ActionType["FEEDBACK_SUBMIT"] = "feedback_submit";
    ActionType["FEEDBACK_RATE"] = "feedback_rate";
    ActionType["FEEDBACK_COMMENT"] = "feedback_comment";
    ActionType["BUG_REPORT"] = "bug_report";
    ActionType["FEATURE_REQUEST"] = "feature_request";
    // System actions
    ActionType["ERROR_ENCOUNTERED"] = "error_encountered";
    ActionType["API_CALL"] = "api_call";
    ActionType["FORM_SUBMIT"] = "form_submit";
    ActionType["BUTTON_CLICK"] = "button_click";
    ActionType["MODAL_OPEN"] = "modal_open";
    ActionType["MODAL_CLOSE"] = "modal_close";
    // Admin actions
    ActionType["ADMIN_LOGIN"] = "admin_login";
    ActionType["USER_APPROVE"] = "user_approve";
    ActionType["USER_SUSPEND"] = "user_suspend";
    ActionType["CONTENT_APPROVE"] = "content_approve";
    ActionType["CONTENT_REJECT"] = "content_reject";
    ActionType["ANALYTICS_VIEW"] = "analytics_view";
    ActionType["REPORT_GENERATE"] = "report_generate";
})(ActionType || (exports.ActionType = ActionType = {}));
var ActionCategory;
(function (ActionCategory) {
    ActionCategory["NAVIGATION"] = "navigation";
    ActionCategory["CONTENT"] = "content";
    ActionCategory["SIGNAGE"] = "signage";
    ActionCategory["USER"] = "user";
    ActionCategory["FEEDBACK"] = "feedback";
    ActionCategory["SYSTEM"] = "system";
    ActionCategory["ADMIN"] = "admin";
})(ActionCategory || (exports.ActionCategory = ActionCategory = {}));
let UserAction = class UserAction {
    // Static factory methods
    static createPageView(betaUserId, sessionId, pageUrl, loadTime, metadata) {
        return {
            betaUserId,
            sessionId,
            actionType: ActionType.PAGE_VIEW,
            actionCategory: ActionCategory.NAVIGATION,
            actionName: 'Page View',
            pageUrl,
            loadTime,
            metadata
        };
    }
    static createContentAction(betaUserId, sessionId, actionType, contentId, contentTitle, metadata) {
        return {
            betaUserId,
            sessionId,
            actionType,
            actionCategory: ActionCategory.CONTENT,
            actionName: actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            metadata: {
                contentId,
                contentTitle,
                ...metadata
            }
        };
    }
    static createSignageAction(betaUserId, sessionId, actionType, targetId, targetName, metadata) {
        return {
            betaUserId,
            sessionId,
            actionType,
            actionCategory: ActionCategory.SIGNAGE,
            actionName: actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            metadata: {
                targetId,
                targetName,
                ...metadata
            }
        };
    }
    static createFeedbackAction(betaUserId, sessionId, actionType, feedbackId, rating, metadata) {
        return {
            betaUserId,
            sessionId,
            actionType,
            actionCategory: ActionCategory.FEEDBACK,
            actionName: actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            metadata: {
                feedbackId,
                rating,
                ...metadata
            }
        };
    }
    static createErrorAction(betaUserId, sessionId, pageUrl, errorMessage, errorCode, metadata) {
        return {
            betaUserId,
            sessionId,
            actionType: ActionType.ERROR_ENCOUNTERED,
            actionCategory: ActionCategory.SYSTEM,
            actionName: 'Error Encountered',
            pageUrl,
            isError: true,
            errorMessage,
            errorCode,
            metadata
        };
    }
    // Instance methods
    getCategoryDisplayName() {
        const categoryNames = {
            [ActionCategory.NAVIGATION]: 'Navigation',
            [ActionCategory.CONTENT]: 'Content',
            [ActionCategory.SIGNAGE]: 'Signage',
            [ActionCategory.USER]: 'User',
            [ActionCategory.FEEDBACK]: 'Feedback',
            [ActionCategory.SYSTEM]: 'System',
            [ActionCategory.ADMIN]: 'Admin'
        };
        return categoryNames[this.actionCategory] || 'Unknown';
    }
    getActionDisplayName() {
        return this.actionName || this.actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    isUserInitiated() {
        return ![ActionType.ERROR_ENCOUNTERED, ActionType.API_CALL].includes(this.actionType);
    }
    isSuccessful() {
        var _a;
        return !this.isError && (((_a = this.httpStatus) === null || _a === void 0 ? void 0 : _a.startsWith('2')) || !this.httpStatus);
    }
    getPerformanceRating() {
        if (!this.responseTime)
            return 'average';
        if (this.responseTime < 100)
            return 'excellent';
        if (this.responseTime < 300)
            return 'good';
        if (this.responseTime < 1000)
            return 'average';
        return 'poor';
    }
};
exports.UserAction = UserAction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserAction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UserAction.prototype, "betaUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BetaUser_1.BetaUser),
    (0, typeorm_1.JoinColumn)({ name: 'betaUserId' }),
    __metadata("design:type", BetaUser_1.BetaUser)
], UserAction.prototype, "betaUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UserAction.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => UserSession_1.UserSession),
    (0, typeorm_1.JoinColumn)({ name: 'sessionId' }),
    __metadata("design:type", UserSession_1.UserSession)
], UserAction.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ActionType }),
    __metadata("design:type", String)
], UserAction.prototype, "actionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ActionCategory }),
    __metadata("design:type", String)
], UserAction.prototype, "actionCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], UserAction.prototype, "actionName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "actionDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "pageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "referrerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "targetElement", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "targetElementId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "targetElementClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], UserAction.prototype, "responseTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], UserAction.prototype, "loadTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "httpStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserAction.prototype, "isError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserAction.prototype, "errorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], UserAction.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserAction.prototype, "createdAt", void 0);
exports.UserAction = UserAction = __decorate([
    (0, typeorm_1.Entity)('user_actions'),
    (0, typeorm_1.Index)(['betaUserId', 'actionType', 'createdAt']),
    (0, typeorm_1.Index)(['sessionId', 'createdAt']),
    (0, typeorm_1.Index)(['actionCategory', 'createdAt']),
    (0, typeorm_1.Index)(['createdAt'])
], UserAction);
//# sourceMappingURL=UserAction.js.map