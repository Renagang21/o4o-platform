/**
 * AdminLinkBlock — Admin 진입점 섹션 블록 (제목 + 선택적 통계 + 링크 목록)
 *
 * WO-O4O-ADMIN-UX-CORE-ADMIN-BLOCK-EXTRACTION-V1
 *
 * GlycoPharm / K-Cosmetics admin dashboard 에 각각 로컬로 중복 구현돼 있던
 * `AdminBlock` 컴포넌트를 공통 추출. AdminDashboardLayout 4-Block 외부에서
 * 서비스별 사업 진입점(재무/거버넌스/네트워크 등) 섹션을 렌더링한다.
 *
 * 설계 원칙:
 *  - 표시 구조만 담당. 서비스 정책/링크/문구/아이콘은 호출부 config 로 주입.
 *  - 아이콘은 ReactNode 로 받아 admin-ux-core 가 특정 아이콘 라이브러리(lucide 등)에
 *    결합되지 않도록 한다. chevron 은 인라인 SVG 로 처리(외부 의존 없음).
 */

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface AdminBlockLink {
  /** Display label */
  label: string;
  /** Route path (react-router Link to) */
  path: string;
  /** Optional description text */
  description?: string;
  /** Optional leading icon (rendered as-is — 호출부에서 className 지정) */
  icon?: ReactNode;
}

export interface AdminBlockStat {
  label: string;
  value: number | string;
}

export interface AdminLinkBlockProps {
  title: string;
  description?: string;
  links: AdminBlockLink[];
  /** Optional summary stats row (link 목록 위에 표시) */
  stats?: AdminBlockStat[];
}

export function AdminLinkBlock({ title, description, links, stats }: AdminLinkBlockProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>

      {stats && stats.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="divide-y divide-slate-50">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
          >
            {link.icon != null && (
              <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
                {link.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700">{link.label}</div>
              {link.description && <div className="text-xs text-slate-400">{link.description}</div>}
            </div>
            {/* chevron — lucide ChevronRight 대응 인라인 SVG (외부 의존 없음) */}
            <svg
              className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
