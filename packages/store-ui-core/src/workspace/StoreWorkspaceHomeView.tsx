/**
 * StoreWorkspaceHomeView — Store Workspace Home (최소 진입 허브)
 *
 * WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 (§10)
 *
 * KPA 대시보드 복사본이 아니다. 매장 이름 · 현재 서비스 라벨 + My Store / Store Hub / My Services 진입 카드만 둔다.
 * 지표 · 알림 · 인사이트는 My Store(StoreHomeShell 계열) 의 책임이며 여기서 재구현하지 않는다.
 */

import { Link } from 'react-router-dom';
import { Store, Compass, LayoutGrid, ArrowRight } from 'lucide-react';
import { STORE_ACCENT_CLASSES } from '../theme/storeAccent';
import type { StoreAccent } from '../theme/storeAccent';
import type { StoreWorkspacePaths } from './storeWorkspace';

export interface StoreWorkspaceHomeViewProps {
  paths: StoreWorkspacePaths;
  accent?: StoreAccent;
  /** 매장(조직) 이름 — 없으면 일반 문구 */
  storeName?: string | null;
  /** 현재 서비스 표시명 (예: 'KPA Society') */
  serviceName?: string;
  /** 카드 아래 부가 영역 (서비스 공지 등, 선택) */
  children?: React.ReactNode;
}

export function StoreWorkspaceHomeView({
  paths,
  accent = 'blue',
  storeName,
  serviceName,
  children,
}: StoreWorkspaceHomeViewProps) {
  const tokens = STORE_ACCENT_CLASSES[accent];
  const cards = [
    {
      to: paths.myStore,
      icon: Store,
      title: '내 매장',
      desc: '매장 정보 · 콘텐츠 · 태블릿 · QR 등 매장 운영 기능',
    },
    {
      to: paths.storeHub,
      icon: Compass,
      title: '매장 HUB',
      desc: '운영자 · 공급자 · 커뮤니티가 제공하는 콘텐츠와 이벤트 오퍼 탐색',
    },
    {
      to: paths.myServices,
      icon: LayoutGrid,
      title: '내 서비스',
      desc: '이 매장이 이용 중인 서비스와 상태 · 다른 서비스 매장 화면으로 이동',
    },
  ];

  return (
    <section data-testid="store-workspace-home" className="space-y-6">
      <header>
        <p className={`text-xs font-medium ${tokens.text} m-0`}>{serviceName ?? '매장 업무공간'}</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1 mb-1">
          {storeName ? `${storeName} 업무공간` : '매장 업무공간'}
        </h1>
        <p className="text-sm text-slate-500 m-0">매장 운영 · 콘텐츠 탐색 · 이용 서비스 진입을 한곳에서 시작합니다.</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-3 list-none p-0 m-0">
        {cards.map(({ to, icon: Icon, title, desc }) => (
          <li key={to}>
            <Link
              to={to}
              className="group block h-full rounded-xl border border-slate-200 bg-white p-5 no-underline hover:border-slate-300 hover:shadow-sm transition"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tokens.badge}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 mb-1 text-base font-semibold text-slate-900 flex items-center gap-1">
                {title}
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </h2>
              <p className="text-sm text-slate-500 m-0">{desc}</p>
            </Link>
          </li>
        ))}
      </ul>

      {children}
    </section>
  );
}
