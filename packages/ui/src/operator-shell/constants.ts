/**
 * OperatorShell Standard Groups
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * CLAUDE.md Section 11: 11-Capability Group 순서 고정.
 */

// WO-O4O-OPERATOR-SHARED-CARE-TYPE-CONTRACT-REMOVAL-V1 (W5c-v2):
//   HeartPulse import 제거 (STANDARD_GROUPS care entry 동반 제거).
import {
  Home,
  Users,
  FileCheck,
  Package,
  Store,
  ShoppingCart,
  FileText,
  Archive,
  BookOpen,
  Monitor,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react';
import { OperatorCapability } from '@o4o/types';
import type { OperatorGroupKey } from './types';

// lucide-react 0.523 미export — Home 의 typeof 로 local 별칭 (모든 lucide 아이콘 동일 시그니처).
type LucideIcon = typeof Home;

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
// WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1:
//   운영자 사이드바 최상위 그룹 라벨 국문화 (영문 → 국문). 매장 사이드바와 언어 정합.
//   SHARED — KPA / Neture / GlycoPharm / K-Cosmetics 4개 operator 대시보드 공통 적용
//   (DomainIASidebar / OperatorAreaShell 소비). label 만 변경, key/capability/순서 불변.
export const STANDARD_GROUPS: StandardGroup[] = [
  { key: 'dashboard', label: '대시보드', icon: Home },
  { key: 'users', label: '회원', icon: Users, capability: OperatorCapability.USER_MANAGEMENT },
  { key: 'approvals', label: '승인', icon: FileCheck, capability: OperatorCapability.MEMBERSHIP_APPROVAL },
  { key: 'products', label: '상품', icon: Package, capability: OperatorCapability.STORE_MANAGEMENT },
  { key: 'stores', label: '매장', icon: Store, capability: OperatorCapability.STORE_MANAGEMENT },
  { key: 'orders', label: '주문', icon: ShoppingCart, capability: OperatorCapability.STORE_MANAGEMENT },
  { key: 'content', label: '콘텐츠', icon: FileText, capability: OperatorCapability.CONTENT_MANAGEMENT },
  // WO-KPA-LMS-INSTRUCTOR-APPROVAL-RELOCATE-V1
  { key: 'resources', label: '자료실', icon: Archive, capability: OperatorCapability.CONTENT_MANAGEMENT },
  { key: 'lms', label: '강의', icon: BookOpen, capability: OperatorCapability.CONTENT_MANAGEMENT },
  { key: 'signage', label: '사이니지', icon: Monitor, capability: OperatorCapability.SIGNAGE },
  { key: 'forum', label: '포럼', icon: MessageSquare, capability: OperatorCapability.COMMUNITY },
  { key: 'analytics', label: '분석', icon: BarChart3, capability: OperatorCapability.ANALYTICS },
  { key: 'system', label: '시스템', icon: Settings, capability: OperatorCapability.SETTINGS },
];
