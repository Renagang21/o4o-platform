import type { ReactNode } from 'react';
import { StoreAiSlot } from '../../components/store/StoreAiPlacement';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import type { StoreWorkspaceOutlet } from '../../components/layouts/StoreWorkspaceShell';
import { workspaceItems } from '../../config/storeWorkspace';
import { MapPin } from 'lucide-react';
import { StoreExecutionHomeView, type StoreExecutionGroup, type StoreExecutionQrInput } from '@o4o/store-ui-core';
import { colors } from '../../styles/theme';
import { fetchTablets } from '../../api/tabletDisplays';
import { getStoreQrCodes } from '../../api/storeQr';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { useStoreResource } from './hooks/useStoreResource';

async function loadTablets() {
  const items = await fetchTablets();
  if (!Array.isArray(items)) throw new Error('Unconfirmed tablet list');
  return items.filter(item => item.is_active !== false).map(item => ({
    id: item.id, name: item.name, location: item.location ?? null,
    isActive: item.is_active !== false, currentScreenSetId: item.currentScreenSetId ?? null,
  }));
}
async function loadQrs() {
  const response = await getStoreQrCodes({ page: 1, limit: 200, includeInactive: true });
  if (response.success !== true || !Array.isArray(response.data?.items) || !Number.isSafeInteger(response.data.total))
    throw new Error('Unconfirmed QR list');
  const items: StoreExecutionQrInput[] = response.data.items.map(item => ({
    id: item.id, title: item.title, slug: item.slug, isActive: item.isActive, scanCount: item.scanCount,
    landable: item.landable, screenSetStatus: item.screenSetStatus ?? null,
    primaryPlacement: item.primaryPlacement ?? null, activePlacementCount: item.activePlacementCount,
  }));
  return { items, total: response.data.total };
}
interface ExecutionProps { workspace?: boolean; navigation?: ReactNode; availableKeys?: string[] }
export default function StoreExecutionPage(props: ExecutionProps) {
  const scope = useStoreOperationScope();
  const outlet = useOutletContext<StoreWorkspaceOutlet | undefined>();
  const availableKeys = props.availableKeys ?? (outlet?.config ? workspaceItems(outlet.config, 'use').map(item => item.key) : undefined);
  return <ExecutionSession key={scope.key} {...props} availableKeys={availableKeys} />;
}
function ExecutionSession({ workspace, navigation, availableKeys }: ExecutionProps) {
  const { pathname } = useLocation();
  const allows = (key: string) => !availableKeys || availableKeys.includes(key);
  const base = storeWorkspaceBase(pathname);
  const tabletAllowed = allows('tablet-displays'), qrAllowed = allows('qr');
  const tablets = useStoreResource(loadTablets, [], tabletAllowed);
  const qrs = useStoreResource(loadQrs, { items: [] as StoreExecutionQrInput[], total: 0 }, qrAllowed);
  const loading = tablets.loading || qrs.loading;
  const failed = !!tablets.error || !!qrs.error;
  const resources = [
    { label: '태블릿', error: tablets.error, loading: tablets.loading, reload: tablets.reload },
    { label: 'QR', error: qrs.error, loading: qrs.loading, reload: qrs.reload },
  ];
  const groupLinks = (group: StoreExecutionGroup) => <nav className="flex flex-wrap gap-3 text-sm text-blue-700">
    {allows('tablet-displays') && group.tablets.length > 0 && <Link className="min-h-11 content-center" to={`${base}/commerce/tablet-displays?workspace=use`}>이 위치의 화면 변경</Link>}
    {allows('qr') && group.qrs.length > 0 && <Link className="min-h-11 content-center" to={`${base}/marketing/qr?workspace=use`}>QR 배치·출력</Link>}
  </nav>;
  return <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold flex items-center gap-2"><MapPin size={20} />{workspace ? '매장 운영' : '위치별 저장 설정'}</h1>
        <p className="mt-2 text-sm text-slate-600">위치별 저장된 태블릿 화면과 QR 설정을 확인합니다. 실제 기기 연결·재생과 QR 스캔 결과는 현장에서 확인해 주세요.</p></div>
      <button type="button" disabled={loading || (!tabletAllowed && !qrAllowed)} onClick={() => { void tablets.reload(); void qrs.reload(); }} className="min-h-11 rounded-lg border px-4 text-sm disabled:opacity-50">새로고침</button>
    </header>
    <StoreAiSlot />
    {navigation}
    <nav aria-label="매장 적용·출력" className="flex flex-wrap gap-2 text-sm">
      {allows('tablet-displays') && <Link className="min-h-11 border rounded-lg px-4 content-center" to={`${base}/commerce/tablet-displays?workspace=use`}>태블릿 화면 변경</Link>}
      {allows('qr') && <Link className="min-h-11 border rounded-lg px-4 content-center" to={`${base}/marketing/qr?workspace=use`}>QR 배치·출력</Link>}
      {allows('signage-playlist') && <Link className="min-h-11 border rounded-lg px-4 content-center" to={`${base}/marketing/signage/playlist?workspace=use`}>사이니지 운영</Link>}
    </nav>
    {(!tabletAllowed || !qrAllowed) && <p className="text-sm text-slate-600">
      {!(tabletAllowed || qrAllowed) ? '현재 이용 가능한 태블릿·QR 기능이 없습니다.' : `${tabletAllowed ? 'QR' : '태블릿'}은 현재 이용 가능한 기능에 포함되지 않아 조회·집계에서 제외합니다.`}
    </p>}
    {resources.map(resource => resource.error && <div key={resource.label} role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {resource.label} 현황을 확인하지 못했습니다. <button type="button" className="min-h-11 underline" disabled={resource.loading} onClick={() => void resource.reload()}>{resource.label} 현황 다시 시도</button>
    </div>)}
    {!loading && failed && <p role="status" className="text-sm text-slate-600">조회에 성공한 자료만 표시합니다. 확인하지 못한 항목은 사용 없음으로 집계하지 않습니다.</p>}
    {!loading && !qrs.error && qrs.data.total > qrs.data.items.length && <p className="text-sm text-amber-800">QR 전체 {qrs.data.total}건 중 {qrs.data.items.length}건 기준입니다. 전체 목록은 QR 배치·출력에서 확인하세요.</p>}
    {qrAllowed && <p className="text-sm text-slate-600">QR 스캔은 조회한 QR의 누적 기록입니다. ‘미배치 QR’은 등록된 배치 위치가 없는 QR이며, 실제 사용 여부를 뜻하지 않습니다.</p>}
    {(tabletAllowed || qrAllowed) && (loading || !failed || (!tablets.error && tablets.data.length > 0) || (!qrs.error && qrs.data.items.length > 0)) && <StoreExecutionHomeView
      tablets={tablets.error ? [] : tablets.data} qrs={qrs.error ? [] : qrs.data.items} loading={loading}
      labels={{ summaryTablets: tabletAllowed ? '조회한 태블릿' : '태블릿 조회 제외', summaryQrPlaced: qrAllowed ? '위치 등록 QR' : 'QR 조회 제외', summaryScans: 'QR 누적 스캔', unplacedHint: '배치 위치가 등록되지 않은 QR입니다. QR 배치·출력에서 위치를 지정할 수 있습니다.', ...(!tabletAllowed ? { emptyAll: '조회한 QR이 없습니다', emptyHint: 'QR 배치·출력에서 저장한 QR을 확인해 주세요.' } : !qrAllowed ? { emptyAll: '조회한 태블릿이 없습니다', emptyHint: '태블릿 화면 변경에서 저장한 태블릿을 확인해 주세요.' } : {}) }}
      palette={{ primary: colors.primary }} renderGroupLinks={groupLinks}
      emptyAction={allows('tablet-displays') ? <Link to={`${base}/commerce/tablet-displays?workspace=use`}>태블릿 화면 적용으로 가기</Link> : undefined}
    />}
  </div>;
}
