import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';

export enum ActivityType {
  // Authentication
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  
  // Profile Management
  PROFILE_UPDATE = 'profile_update',
  AVATAR_UPDATE = 'avatar_update',
  BUSINESS_INFO_UPDATE = 'business_info_update',
  
  // Account Status
  ACCOUNT_ACTIVATION = 'account_activation',
  ACCOUNT_DEACTIVATION = 'account_deactivation',
  ACCOUNT_SUSPENSION = 'account_suspension',
  ACCOUNT_UNSUSPENSION = 'account_unsuspension',
  EMAIL_VERIFICATION = 'email_verification',
  
  // Role and Permissions
  ROLE_CHANGE = 'role_change',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  
  // Admin Actions
  ADMIN_APPROVAL = 'admin_approval',
  ADMIN_REJECTION = 'admin_rejection',
  ADMIN_NOTE_ADD = 'admin_note_add',
  
  // Security
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',
  TWO_FACTOR_ENABLE = 'two_factor_enable',
  TWO_FACTOR_DISABLE = 'two_factor_disable',
  
  // API Access
  API_KEY_CREATE = 'api_key_create',
  API_KEY_DELETE = 'api_key_delete',
  API_ACCESS_DENIED = 'api_access_denied',
  
  // System Events
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  GDPR_REQUEST = 'gdpr_request'
}

export enum ActivityCategory {
  AUTHENTICATION = 'authentication',
  PROFILE = 'profile',
  SECURITY = 'security',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

export interface ActivityMetadata {
  // IP and location
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  
  // Change details
  oldValue?: string;
  newValue?: string;
  changedFields?: string[];
  
  // Admin action details
  adminUserId?: string;
  adminUserEmail?: string;
  adminReason?: string;
  
  // Security details
  loginMethod?: string;
  deviceInfo?: string;
  browserInfo?: string;
  
  // API details
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  
  // Custom metadata
  [key: string]: any;
}

@Entity('user_activity_logs')
@Index(['userId', 'activityType', 'created_at'])
@Index(['activityCategory', 'created_at'])
@Index(['created_at'])
export class UserActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: ActivityType })
  activityType!: ActivityType;

  @Column({ type: 'enum', enum: ActivityCategory })
  activityCategory!: ActivityCategory;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: ActivityMetadata;

  @Column({ type: 'boolean', default: false })
  isSystemGenerated!: boolean;

  @Column({ type: 'uuid', nullable: true })
  performedByUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedByUserId' })
  performedBy?: User;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper methods
  static createLoginActivity(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: ActivityMetadata
  ): Partial<UserActivityLog> {
    return {
      userId,
      activityType: ActivityType.LOGIN,
      activityCategory: ActivityCategory.AUTHENTICATION,
      title: 'User logged in',
      description: 'User successfully logged into the system',
      ipAddress,
      userAgent,
      metadata
    };
  }

  static createLogoutActivity(
    userId: string,
    ipAddress?: string,
    metadata?: ActivityMetadata
  ): Partial<UserActivityLog> {
    return {
      userId,
      activityType: ActivityType.LOGOUT,
      activityCategory: ActivityCategory.AUTHENTICATION,
      title: 'User logged out',
      description: 'User logged out of the system',
      ipAddress,
      metadata
    };
  }

  static createProfileUpdateActivity(
    userId: string,
    changedFields: string[],
    performedByUserId?: string,
    metadata?: ActivityMetadata
  ): Partial<UserActivityLog> {
    return {
      userId,
      activityType: ActivityType.PROFILE_UPDATE,
      activityCategory: ActivityCategory.PROFILE,
      title: 'Profile updated',
      description: `Updated fields: ${changedFields.join(', ')}`,
      performedByUserId,
      isSystemGenerated: false,
      metadata: {
        changedFields,
        ...metadata
      }
    };
  }

  static createRoleChangeActivity(
    userId: string,
    oldRole: string,
    newRole: string,
    performedByUserId: string,
    reason?: string
  ): Partial<UserActivityLog> {
    return {
      userId,
      activityType: ActivityType.ROLE_CHANGE,
      activityCategory: ActivityCategory.ADMIN,
      title: 'Role changed',
      description: `Role changed from ${oldRole} to ${newRole}`,
      performedByUserId,
      isSystemGenerated: false,
      metadata: {
        oldValue: oldRole,
        newValue: newRole,
        adminReason: reason
      }
    };
  }

  static createAdminApprovalActivity(
    userId: string,
    performedByUserId: string,
    reason?: string
  ): Partial<UserActivityLog> {
    return {
      userId,
      activityType: ActivityType.ADMIN_APPROVAL,
      activityCategory: ActivityCategory.ADMIN,
      title: 'Account approved',
      description: 'Account was approved by administrator',
      performedByUserId,
      isSystemGenerated: false,
      metadata: {
        adminReason: reason
      }
    };
  }

  static createAccountStatusActivity(
    userId: string,
    activityType: ActivityType,
    performedByUserId?: string,
    reason?: string
  ): Partial<UserActivityLog> {
    const titles: Record<ActivityType, string> = {
      [ActivityType.ACCOUNT_ACTIVATION]: 'Account activated',
      [ActivityType.ACCOUNT_DEACTIVATION]: 'Account deactivated', 
      [ActivityType.ACCOUNT_SUSPENSION]: 'Account suspended',
      [ActivityType.ACCOUNT_UNSUSPENSION]: 'Account unsuspended',
      [ActivityType.EMAIL_VERIFICATION]: 'Email verified',
      // Add other activity types as needed
    } as any;

    return {
      userId,
      activityType,
      activityCategory: ActivityCategory.ADMIN,
      title: titles[activityType] || 'Account status changed',
      description: reason || 'Account status was modified',
      performedByUserId,
      isSystemGenerated: !performedByUserId,
      metadata: {
        adminReason: reason
      }
    };
  }

  // Instance methods
  getDisplayTitle(): string {
    return this.title;
  }

  getDisplayDescription(): string {
    if (this.description) return this.description;
    
    const typeDisplayNames: Partial<Record<ActivityType, string>> = {
      [ActivityType.LOGIN]: 'Logged into the system',
      [ActivityType.LOGOUT]: 'Logged out of the system',
      [ActivityType.PROFILE_UPDATE]: 'Updated profile information',
      [ActivityType.ROLE_CHANGE]: 'Role was modified',
      [ActivityType.ACCOUNT_ACTIVATION]: 'Account was activated',
      [ActivityType.ACCOUNT_SUSPENSION]: 'Account was suspended'
    };
    
    return typeDisplayNames[this.activityType] || 'Activity performed';
  }

  isSecurityRelated(): boolean {
    return [
      ActivityType.LOGIN,
      ActivityType.LOGOUT,
      ActivityType.PASSWORD_CHANGE,
      ActivityType.PASSWORD_RESET_REQUEST,
      ActivityType.PASSWORD_RESET_COMPLETE,
      ActivityType.TWO_FACTOR_ENABLE,
      ActivityType.TWO_FACTOR_DISABLE,
      ActivityType.API_ACCESS_DENIED
    ].includes(this.activityType);
  }

  isAdminAction(): boolean {
    return this.activityCategory === ActivityCategory.ADMIN;
  }

  getCategoryDisplayName(): string {
    const categoryNames: Record<ActivityCategory, string> = {
      [ActivityCategory.AUTHENTICATION]: 'Authentication',
      [ActivityCategory.PROFILE]: 'Profile',
      [ActivityCategory.SECURITY]: 'Security',
      [ActivityCategory.ADMIN]: 'Administration',
      [ActivityCategory.SYSTEM]: 'System'
    };
    return categoryNames[this.activityCategory];
  }
}