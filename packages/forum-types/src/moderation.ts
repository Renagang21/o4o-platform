import type { BaseEntity } from '@o4o/types';

export interface ModerationAction extends BaseEntity {
  moderatorId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  action: ModerationType;
  reason: string;
  notes?: string;
  expiresAt?: Date | string;
  reversedAt?: Date | string;
  reversedBy?: string;
}

export enum ModerationType {
  // Post/Comment actions
  APPROVE = 'approve',
  REJECT = 'reject',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  PIN = 'pin',
  UNPIN = 'unpin',
  DELETE = 'delete',
  RESTORE = 'restore',
  EDIT = 'edit',
  
  // User actions
  WARN = 'warn',
  MUTE = 'mute',
  UNMUTE = 'unmute',
  BAN = 'ban',
  UNBAN = 'unban'
}

export interface ModerationQueue {
  items: Array<{
    id: string;
    type: 'post' | 'comment' | 'report';
    targetId: string;
    reason: string;
    reportCount?: number;
    createdAt: Date | string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }>;
  totalItems: number;
  pendingReports: number;
  autoFlaggedItems: number;
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'behavior';
  trigger: string | RegExp;
  action: 'flag' | 'hide' | 'reject';
  severity: 'low' | 'medium' | 'high';
  isActive: boolean;
  appliesTo: ('post' | 'comment')[];
}

export interface BannedWord extends BaseEntity {
  word: string;
  severity: 'mild' | 'moderate' | 'severe';
  action: 'warn' | 'replace' | 'reject';
  replacement?: string;
  isActive: boolean;
}