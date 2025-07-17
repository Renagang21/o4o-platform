import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { BetaUser } from './BetaUser';
import { UserSession } from './UserSession';

// Type definition for action metadata
export interface ActionMetadata {
  // Content-specific
  contentId?: string;
  contentType?: string;
  contentTitle?: string;
  playlistId?: string;
  templateId?: string;
  
  // UI-specific
  clickPosition?: { x: number; y: number };
  scrollPosition?: number;
  viewportSize?: { width: number; height: number };
  
  // Form-specific
  formId?: string;
  fieldName?: string;
  fieldValue?: string;
  
  // Search-specific
  searchQuery?: string;
  searchResults?: number;
  filterCriteria?: string[];
  
  // Performance-specific
  memoryUsage?: number;
  networkLatency?: number;
  renderTime?: number;
  
  // Feedback-specific
  feedbackId?: string;
  rating?: number;
  
  // Target-specific
  targetId?: string;
  targetName?: string;
  
  // Custom properties
  [key: string]: unknown;
}

export enum ActionType {
  // Navigation actions
  PAGE_VIEW = 'page_view',
  NAVIGATION = 'navigation',
  MENU_CLICK = 'menu_click',
  SEARCH = 'search',
  FILTER = 'filter',
  SORT = 'sort',

  // Content actions
  CONTENT_VIEW = 'content_view',
  CONTENT_PLAY = 'content_play',
  CONTENT_PAUSE = 'content_pause',
  CONTENT_STOP = 'content_stop',
  CONTENT_SKIP = 'content_skip',
  CONTENT_DOWNLOAD = 'content_download',
  CONTENT_SHARE = 'content_share',

  // Signage actions
  SIGNAGE_CREATE = 'signage_create',
  SIGNAGE_EDIT = 'signage_edit',
  SIGNAGE_DELETE = 'signage_delete',
  SIGNAGE_PUBLISH = 'signage_publish',
  SIGNAGE_SCHEDULE = 'signage_schedule',
  PLAYLIST_CREATE = 'playlist_create',
  PLAYLIST_EDIT = 'playlist_edit',
  TEMPLATE_USE = 'template_use',

  // User actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  PROFILE_UPDATE = 'profile_update',
  SETTINGS_CHANGE = 'settings_change',
  PREFERENCE_UPDATE = 'preference_update',

  // Feedback actions
  FEEDBACK_SUBMIT = 'feedback_submit',
  FEEDBACK_RATE = 'feedback_rate',
  FEEDBACK_COMMENT = 'feedback_comment',
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',

  // System actions
  ERROR_ENCOUNTERED = 'error_encountered',
  API_CALL = 'api_call',
  FORM_SUBMIT = 'form_submit',
  BUTTON_CLICK = 'button_click',
  MODAL_OPEN = 'modal_open',
  MODAL_CLOSE = 'modal_close',

  // Admin actions
  ADMIN_LOGIN = 'admin_login',
  USER_APPROVE = 'user_approve',
  USER_SUSPEND = 'user_suspend',
  CONTENT_APPROVE = 'content_approve',
  CONTENT_REJECT = 'content_reject',
  ANALYTICS_VIEW = 'analytics_view',
  REPORT_GENERATE = 'report_generate'
}

export enum ActionCategory {
  NAVIGATION = 'navigation',
  CONTENT = 'content',
  SIGNAGE = 'signage',
  USER = 'user',
  FEEDBACK = 'feedback',
  SYSTEM = 'system',
  ADMIN = 'admin'
}

@Entity('user_actions')
@Index(['betaUserId', 'actionType', 'createdAt'])
@Index(['sessionId', 'createdAt'])
@Index(['actionCategory', 'createdAt'])
@Index(['createdAt'])
export class UserAction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  betaUserId!: string;

  @ManyToOne(() => BetaUser)
  @JoinColumn({ name: 'betaUserId' })
  betaUser!: BetaUser;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => UserSession)
  @JoinColumn({ name: 'sessionId' })
  session!: UserSession;

  // Action details
  @Column({ type: 'enum', enum: ActionType })
  actionType!: ActionType;

  @Column({ type: 'enum', enum: ActionCategory })
  actionCategory!: ActionCategory;

  @Column({ type: 'varchar', length: 255 })
  actionName!: string;

  @Column({ type: 'text', nullable: true })
  actionDescription?: string;

  // Context information
  @Column({ type: 'varchar', length: 500, nullable: true })
  pageUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrerUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetElement?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetElementId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetElementClass?: string;

  // Performance metrics
  @Column({ type: 'int', nullable: true })
  responseTime?: number; // in milliseconds

  @Column({ type: 'int', nullable: true })
  loadTime?: number; // in milliseconds

  @Column({ type: 'varchar', length: 20, nullable: true })
  httpStatus?: string;

  @Column({ type: 'boolean', default: false })
  isError!: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode?: string;

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata?: ActionMetadata;

  @CreateDateColumn()
  createdAt!: Date;

  // Static factory methods
  static createPageView(
    betaUserId: string,
    sessionId: string,
    pageUrl: string,
    loadTime?: number,
    metadata?: ActionMetadata
  ): Partial<UserAction> {
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

  static createContentAction(
    betaUserId: string,
    sessionId: string,
    actionType: ActionType,
    contentId: string,
    contentTitle: string,
    metadata?: ActionMetadata
  ): Partial<UserAction> {
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

  static createSignageAction(
    betaUserId: string,
    sessionId: string,
    actionType: ActionType,
    targetId: string,
    targetName: string,
    metadata?: ActionMetadata
  ): Partial<UserAction> {
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

  static createFeedbackAction(
    betaUserId: string,
    sessionId: string,
    actionType: ActionType,
    feedbackId?: string,
    rating?: number,
    metadata?: ActionMetadata
  ): Partial<UserAction> {
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

  static createErrorAction(
    betaUserId: string,
    sessionId: string,
    pageUrl: string,
    errorMessage: string,
    errorCode?: string,
    metadata?: ActionMetadata
  ): Partial<UserAction> {
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
  getCategoryDisplayName(): string {
    const categoryNames: Record<ActionCategory, string> = {
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

  getActionDisplayName(): string {
    return this.actionName || this.actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  isUserInitiated(): boolean {
    return ![ActionType.ERROR_ENCOUNTERED, ActionType.API_CALL].includes(this.actionType);
  }

  isSuccessful(): boolean {
    return !this.isError && (this.httpStatus?.startsWith('2') || !this.httpStatus);
  }

  getPerformanceRating(): 'excellent' | 'good' | 'average' | 'poor' {
    if (!this.responseTime) return 'average';
    
    if (this.responseTime < 100) return 'excellent';
    if (this.responseTime < 300) return 'good';
    if (this.responseTime < 1000) return 'average';
    return 'poor';
  }
}