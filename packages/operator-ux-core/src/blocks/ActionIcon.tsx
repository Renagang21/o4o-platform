/**
 * ActionIcon — dashboard action(QuickAction) 아이콘 렌더 헬퍼
 *
 * WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1 (Phase A):
 * 백엔드가 내려주는 icon 문자열을 처리한다.
 *  - lucide-name(kebab) → lucide 컴포넌트 매핑 렌더
 *  - emoji 등 비-ASCII → 기존처럼 그대로 통과 (KPA emoji 회귀 0)
 *  - 매핑에 없는 name-like(ASCII) → 텍스트 노출 방지 위해 생략
 *
 * WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 (Phase B):
 * KPA backend quickActions 의 12 emoji 가 lucide-name 으로 정렬됨에 따라
 * vocabulary 16종 (Phase A 9 + Phase B 7) 으로 확장.
 *  - 신규 7종: clipboard-list / megaphone / message-square / monitor-play /
 *             badge-percent / home / scroll-text
 *  - Phase A 의 emoji fallback / NAME_LIKE skip 동작은 유지 (GlycoPharm/K-Cos/
 *    Neture 의 기존 emoji 또는 미매핑 lucide-name 회귀 0).
 */
import type { ComponentType } from 'react';
import {
  Users,
  Shield,
  Store,
  DollarSign,
  Percent,
  Key,
  Package,
  FileText,
  ShoppingCart,
  ClipboardList,
  Megaphone,
  MessageSquare,
  MonitorPlay,
  BadgePercent,
  Home,
  ScrollText,
  BarChart3,
  Building2,
  Settings,
} from 'lucide-react';

/**
 * WO-O4O-WORKSPACE-DEPENDENCY-AND-CI-EXIT-CODE-HARDENING-V1:
 * 소비처(apps/admin-dashboard)에 `declare module 'lucide-react';` shorthand ambient
 * 선언이 있어 lucide-react 의 실제 타입이 가려진다. 그 프로그램에서는 `LucideIcon`
 * 이 타입이 아닌 namespace 로 잡혀 TS2709 가 난다. 런타임 동작과 무관한 타입
 * 표기이므로, 소비처 shim 유무와 무관하게 성립하는 컴포넌트 타입으로 표기한다.
 */
type IconComponent = ComponentType<Record<string, unknown>>;

const ICON_NAME_MAP: Record<string, IconComponent> = {
  users: Users,
  shield: Shield,
  store: Store,
  'dollar-sign': DollarSign,
  percent: Percent,
  key: Key,
  package: Package,
  'file-text': FileText,
  'shopping-cart': ShoppingCart,
  // WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 (Phase B): KPA 12 icon 정렬용
  'clipboard-list': ClipboardList,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  'monitor-play': MonitorPlay,
  'badge-percent': BadgePercent,
  home: Home,
  'scroll-text': ScrollText,
  // WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1 (Phase C): KPA/GP admin 8 emoji 정렬용
  'bar-chart-3': BarChart3,
  'building-2': Building2,
  settings: Settings,
};

// ASCII 영문/숫자/하이픈만 = lucide-name 후보
const NAME_LIKE = /^[a-z0-9-]+$/i;

export function ActionIcon({ icon }: { icon?: string }) {
  if (!icon) return null;
  const Mapped = ICON_NAME_MAP[icon];
  if (Mapped) return <Mapped size={18} className="text-slate-600 shrink-0" />;
  // 매핑에 없는 lucide-name 추정(ASCII) → 텍스트 노출 방지 위해 생략
  if (NAME_LIKE.test(icon)) return null;
  // emoji 등 비-ASCII → 기존처럼 통과
  return <span className="text-lg">{icon}</span>;
}
