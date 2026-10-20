import type { StoreDashboardConfig, StoreMenuSectionItem } from '@o4o/store-ui-core';
import { Link, useLocation } from 'react-router-dom';
import { StoreAiSlot } from '../../components/store/StoreAiPlacement';
import { StoreOperationsNavigation } from '../../components/store/StoreOperationsNavigation';
import { currentStoreOperation, workspaceGroups } from '../../config/storeWorkspace';

const actionLabels: Record<string, string> = {
  'multilingual-consultation': '다국어 상담 시작',
  'staff-support': '상품 위치·기본 안내',
  'tablet-requests': '상담 요청 확인',
  'signage-playlist': '재생할 안내·순서 변경',
  'signage-schedules': '재생 일정 관리',
  'signage-player': '재생 화면 열기',
  'tablet-displays': '태블릿 위치·화면 관리',
  'store-execution': '위치별 저장 설정',
};
const actionDescriptions: Record<string, string> = {
  'multilingual-consultation': '약사 상담·직원 응대 모드와 고객 언어를 선택합니다. 이용 가능한 모드는 상담 화면에서 확인합니다.',
  'staff-support': '상품 위치와 짧은 안내를 찾아 고객에게 설명하고 요청을 기록합니다.',
  'signage-playlist': '저장된 안내로 재생 목록을 구성하고 미리보기로 확인합니다.',
  'tablet-displays': '저장한 화면을 적용하고 고객이 볼 구성을 확인합니다.',
  qr: '연결할 안내와 설치 위치를 확인하고 고객용 QR을 출력합니다.',
};
const linkStyle = 'inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:border-teal-600';

/** A task chooser without device queries. Detailed tools keep their existing routes and guards. */
export default function StoreOperationsPage({ config }: { config: StoreDashboardConfig }) {
  const location = useLocation();
  const selected = currentStoreOperation(config, location.pathname, location.search);
  const details = workspaceGroups(config, 'use').find(group => group.key === 'details');
  const allItems = config.menuSections?.flatMap(section => section.items) ?? [];
  const resources = selected?.key === 'consultation'
    ? allItems.filter(item => item.key === 'my-products' || item.key === 'library-contents')
    : [];
  const action = (item: StoreMenuSectionItem) => <Link key={item.key} className={linkStyle} to={`${config.basePath}${item.subPath}`}>
    {actionLabels[item.key] ?? item.label}
  </Link>;
  return <div className="mx-auto max-w-5xl space-y-5">
    <header>
      <h1 className="text-xl font-bold text-slate-900">매장 운영</h1>
      <p className="mt-1 text-sm text-slate-600">고객 상담과 매장에서 사용하는 안내를 관리합니다.</p>
    </header>
    <StoreAiSlot />
    <StoreOperationsNavigation config={config} />
    {selected ? <section key={selected.key} aria-labelledby="operation-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 id="operation-heading" className="text-lg font-semibold text-slate-900">{selected.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{selected.description}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {selected.primary.map(item => <Link key={item.key} to={`${config.basePath}${item.subPath}`} aria-label={actionLabels[item.key] ?? item.label}
          className="rounded-xl border border-slate-200 p-4 hover:border-teal-600 hover:bg-teal-50 focus-visible:outline-teal-700">
          <span className="block font-semibold text-teal-800">{actionLabels[item.key] ?? item.label} →</span>
          {actionDescriptions[item.key] && <span className="mt-2 block text-sm leading-6 text-slate-600">{actionDescriptions[item.key]}</span>}
        </Link>)}
      </div>
      {!!selected.secondary.length && <nav aria-label={`${selected.title} 추가 업무`} className="mt-4 flex flex-wrap gap-2">{selected.secondary.map(action)}</nav>}
      {!!resources.length && <details className="mt-5 border-t border-slate-100 pt-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-slate-600">상담에 사용할 상품·안내 자료</summary>
        <nav aria-label="상담 참고 자료" className="mt-2 flex flex-wrap gap-2">{resources.map(action)}</nav>
      </details>}
    </section> : <p role="status" className="rounded-xl border bg-white p-5 text-sm text-slate-600">현재 이용할 수 있는 운영 업무가 없습니다.</p>}
    {details && <details className="rounded-xl border border-slate-200 bg-white px-4">
      <summary className="min-h-11 cursor-pointer content-center text-sm text-slate-600">배치·이용 현황 확인</summary>
      <p className="mt-1 text-sm text-slate-500">저장 설정과 이용 기록을 확인합니다. 실제 연결·재생·QR 스캔은 현장에서 확인해 주세요.</p>
      <nav aria-label="운영 현황 상세" className="flex flex-wrap gap-2 py-4">{[...details.primary, ...details.secondary].map(action)}</nav>
    </details>}
  </div>;
}
