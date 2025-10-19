import { BetaUser } from './BetaUser';
import { UserSession } from './UserSession';
export interface ActionMetadata {
    contentId?: string;
    contentType?: string;
    contentTitle?: string;
    playlistId?: string;
    templateId?: string;
    clickPosition?: {
        x: number;
        y: number;
    };
    scrollPosition?: number;
    viewportSize?: {
        width: number;
        height: number;
    };
    formId?: string;
    fieldName?: string;
    fieldValue?: string;
    searchQuery?: string;
    searchResults?: number;
    filterCriteria?: string[];
    memoryUsage?: number;
    networkLatency?: number;
    renderTime?: number;
    feedbackId?: string;
    rating?: number;
    targetId?: string;
    targetName?: string;
    [key: string]: unknown;
}
export declare enum ActionType {
    PAGE_VIEW = "page_view",
    NAVIGATION = "navigation",
    MENU_CLICK = "menu_click",
    SEARCH = "search",
    FILTER = "filter",
    SORT = "sort",
    CONTENT_VIEW = "content_view",
    CONTENT_PLAY = "content_play",
    CONTENT_PAUSE = "content_pause",
    CONTENT_STOP = "content_stop",
    CONTENT_SKIP = "content_skip",
    CONTENT_DOWNLOAD = "content_download",
    CONTENT_SHARE = "content_share",
    SIGNAGE_CREATE = "signage_create",
    SIGNAGE_EDIT = "signage_edit",
    SIGNAGE_DELETE = "signage_delete",
    SIGNAGE_PUBLISH = "signage_publish",
    SIGNAGE_SCHEDULE = "signage_schedule",
    PLAYLIST_CREATE = "playlist_create",
    PLAYLIST_EDIT = "playlist_edit",
    TEMPLATE_USE = "template_use",
    LOGIN = "login",
    LOGOUT = "logout",
    PROFILE_UPDATE = "profile_update",
    SETTINGS_CHANGE = "settings_change",
    PREFERENCE_UPDATE = "preference_update",
    FEEDBACK_SUBMIT = "feedback_submit",
    FEEDBACK_RATE = "feedback_rate",
    FEEDBACK_COMMENT = "feedback_comment",
    BUG_REPORT = "bug_report",
    FEATURE_REQUEST = "feature_request",
    ERROR_ENCOUNTERED = "error_encountered",
    API_CALL = "api_call",
    FORM_SUBMIT = "form_submit",
    BUTTON_CLICK = "button_click",
    MODAL_OPEN = "modal_open",
    MODAL_CLOSE = "modal_close",
    ADMIN_LOGIN = "admin_login",
    USER_APPROVE = "user_approve",
    USER_SUSPEND = "user_suspend",
    CONTENT_APPROVE = "content_approve",
    CONTENT_REJECT = "content_reject",
    ANALYTICS_VIEW = "analytics_view",
    REPORT_GENERATE = "report_generate"
}
export declare enum ActionCategory {
    NAVIGATION = "navigation",
    CONTENT = "content",
    SIGNAGE = "signage",
    USER = "user",
    FEEDBACK = "feedback",
    SYSTEM = "system",
    ADMIN = "admin"
}
export declare class UserAction {
    id: string;
    betaUserId: string;
    betaUser: BetaUser;
    sessionId: string;
    session: UserSession;
    actionType: ActionType;
    actionCategory: ActionCategory;
    actionName: string;
    actionDescription?: string;
    pageUrl?: string;
    referrerUrl?: string;
    targetElement?: string;
    targetElementId?: string;
    targetElementClass?: string;
    responseTime?: number;
    loadTime?: number;
    httpStatus?: string;
    isError: boolean;
    errorMessage?: string;
    errorCode?: string;
    metadata?: ActionMetadata;
    createdAt: Date;
    static createPageView(betaUserId: string, sessionId: string, pageUrl: string, loadTime?: number, metadata?: ActionMetadata): Partial<UserAction>;
    static createContentAction(betaUserId: string, sessionId: string, actionType: ActionType, contentId: string, contentTitle: string, metadata?: ActionMetadata): Partial<UserAction>;
    static createSignageAction(betaUserId: string, sessionId: string, actionType: ActionType, targetId: string, targetName: string, metadata?: ActionMetadata): Partial<UserAction>;
    static createFeedbackAction(betaUserId: string, sessionId: string, actionType: ActionType, feedbackId?: string, rating?: number, metadata?: ActionMetadata): Partial<UserAction>;
    static createErrorAction(betaUserId: string, sessionId: string, pageUrl: string, errorMessage: string, errorCode?: string, metadata?: ActionMetadata): Partial<UserAction>;
    getCategoryDisplayName(): string;
    getActionDisplayName(): string;
    isUserInitiated(): boolean;
    isSuccessful(): boolean;
    getPerformanceRating(): 'excellent' | 'good' | 'average' | 'poor';
}
//# sourceMappingURL=UserAction.d.ts.map