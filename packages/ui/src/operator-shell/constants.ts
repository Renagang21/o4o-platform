/**
 * OperatorShell Standard Groups
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * CLAUDE.md Section 11: 11-Capability Group 순서 고정.
 */

import {
  Home,
  Users,
  FileCheck,
  Package,
  Store,
  ShoppingCart,
  FileText,
  Monitor,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OperatorCapability } from '@o4o/types';
import type { OperatorGroupKey } from './types';

export interface StandardGroup {
  key: OperatorGroupKey;
  label: string;
  icon: LucideIcon;
  capability?: OperatorCapability;
}

/**
 * 11-Capability Group 표준 정의.
 * 순서, 라벨, 아이콘, Capability 매핑 — 모두 고정.
 * 서비스는 이 구조를 변경할 수 없고, 항목(items)만 제공.
 */
export const STANDARD_GROUPS: StandardGroup[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'users', label: 'Users', icon: Users, capability: OperatorCapability.USER_MANAGEMENT },
  { key: 'approvals', label: 'Approvals', icon: FileCheck, capability: OperatorCapability.MEMBERSHIP_APPROVAL },
  { key: 'products', label: 'Products', icon: Package, capability: OperatorCapability.STORE_MANAGEMENT },
  { key: 'stores', label: 'Stores', icon: Store, capability: OperatorCapability.STORE_MANAGEMENT },
  { key: 'orders', label: 'Orders', icon: ShoppingCart, capability: OperatorCapability.STORE_MANAGEMENT },
  { key: 'content', label: 'Content', icon: FileText, capability: OperatorCapability.CONTENT_MANAGEMENT },
  { key: 'signage', label: 'Signage', icon: Monitor, capability: OperatorCapability.SIGNAGE },
  { key: 'forum', label: 'Forum', icon: MessageSquare, capability: OperatorCapability.COMMUNITY },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, capability: OperatorCapability.ANALYTICS },
  { key: 'system', label: 'System', icon: Settings, capability: OperatorCapability.SETTINGS },
];
