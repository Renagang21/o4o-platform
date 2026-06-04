/**
 * ActionIcon — dashboard action(StructureAction) 아이콘 렌더 헬퍼
 *
 * WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1 (Phase A):
 * 백엔드가 내려주는 icon 문자열을 처리한다.
 *  - lucide-name(kebab) → lucide 컴포넌트 매핑 렌더
 *  - emoji 등 비-ASCII → 기존처럼 그대로 통과 (회귀 0)
 *  - 매핑에 없는 name-like(ASCII) → 텍스트 노출 방지 위해 생략
 *
 * WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 (Phase B):
 * operator-ux-core ActionIcon 과 동일 vocabulary 16종 유지 (Phase A 9 + Phase B 7).
 *  - 신규 7종: clipboard-list / megaphone / message-square / monitor-play /
 *             badge-percent / home / scroll-text
 *  - Phase A 의 emoji fallback / NAME_LIKE skip 동작 유지.
 */
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
  type LucideIcon,
} from 'lucide-react';

const ICON_NAME_MAP: Record<string, LucideIcon> = {
  users: Users,
  shield: Shield,
  store: Store,
  'dollar-sign': DollarSign,
  percent: Percent,
  key: Key,
  package: Package,
  'file-text': FileText,
  'shopping-cart': ShoppingCart,
  // WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 (Phase B)
  'clipboard-list': ClipboardList,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  'monitor-play': MonitorPlay,
  'badge-percent': BadgePercent,
  home: Home,
  'scroll-text': ScrollText,
  // WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1 (Phase C): KPA/GP admin Structure Actions 정렬
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
