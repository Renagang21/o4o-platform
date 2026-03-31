/**
 * Member Badges — 상태/역할 뱃지 표준 컴포넌트
 *
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 */

// ── Status Badge ──

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: '활성', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  approved:  { label: '승인', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  pending:   { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  rejected:  { label: '거부', color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
  suspended: { label: '정지', color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
  inactive:  { label: '비활성', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.inactive;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${style.bg} ${style.color}`}>
      {style.label}
    </span>
  );
}

// ── Role Badge ──

const ROLE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  // GlycoPharm
  pharmacy:    { label: '약국',   color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  customer:    { label: '당뇨인', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  // Neture
  supplier:    { label: '공급자', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  partner:     { label: '파트너', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  seller:      { label: '셀러',   color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  // K-Cosmetics
  consumer:    { label: '소비자', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  // KPA
  pharmacist:  { label: '약사',   color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  student:     { label: '학생',   color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200' },
  // Admin
  'glycopharm:admin':     { label: '관리자',   color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  'glycopharm:operator':  { label: '운영자',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  'neture:admin':         { label: '관리자',   color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  'neture:operator':      { label: '운영자',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  'glucoseview:admin':    { label: '관리자',   color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  'glucoseview:operator': { label: '운영자',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  'k-cosmetics:admin':    { label: '관리자',   color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  'k-cosmetics:operator': { label: '운영자',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  'kpa:admin':            { label: '관리자',   color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  'kpa:operator':         { label: '운영자',   color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  'platform:super_admin': { label: '슈퍼관리자', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  'glycopharm:pharmacist':{ label: '약사(test)', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
};

export function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] || { label: role, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${style.bg} ${style.color}`}>
      {style.label}
    </span>
  );
}

// ── Service Badge ──

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
  'kpa-society': 'KPA',
};

export function ServiceBadge({ serviceKey }: { serviceKey: string }) {
  const label = SERVICE_LABELS[serviceKey] || serviceKey;
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
      {label}
    </span>
  );
}
