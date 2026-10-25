import type { ReactNode } from 'react';
import { Link, useLocation, useResolvedPath } from 'react-router-dom';
import './cooperation-member-presentation.css';

/** Links and status are supplied by each service. This module never reads or grants access. */
export interface CooperationMemberLink {
  key: string;
  label: string;
  to: string;
  end?: boolean;
}

function MemberLink({ item }: { item: CooperationMemberLink }) {
  const current = useLocation();
  const target = useResolvedPath(item.to);
  const samePath = current.pathname.replace(/\/$/, '') === target.pathname.replace(/\/$/, '');
  const active = target.hash
    ? samePath && current.hash === target.hash
    : (samePath && (!item.end || !current.hash)) || (!item.end && current.pathname.startsWith(`${target.pathname.replace(/\/$/, '')}/`) && !samePath);
  return <Link to={item.to} aria-current={active ? target.hash ? 'location' : 'page' : undefined}>{item.label}</Link>;
}

export function CooperationMemberNavigation({ items, label = '회원 공간 메뉴' }: {
  items: readonly CooperationMemberLink[];
  label?: string;
}) {
  return <nav className="cooperation-member-nav" aria-label={label}>
    {items.map(item => <MemberLink key={item.key} item={item} />)}
  </nav>;
}

/** Personal cooperative membership and pharmacy membership remain separate service adapters. */
export function CooperationMemberHomeLayout({ navigation, summary, children, summaryLabel = '내 참여와 지원' }: {
  navigation?: ReactNode;
  summary: ReactNode;
  children: ReactNode;
  summaryLabel?: string;
}) {
  return <div className="cooperation-member-home">
    {navigation}
    <div className="cooperation-member-home-grid">
      <aside className="cooperation-member-home-summary" aria-label={summaryLabel}>{summary}</aside>
      <div className="cooperation-member-home-content">{children}</div>
    </div>
  </div>;
}
