/**
 * StoreAssetsPage — store-web publishing session.
 * The shared panel and policy gates remain canonical; this service owns scoped
 * requests, confirmed updates and retries without changing StoreAssetsView/Core.
 */

import { StoreAssetsPanel } from '@o4o/store-asset-policy-core';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { StoreLibraryNavigation } from '../../components/StoreLibraryNavigation';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { useStorePublishing } from './operations/useStorePublishing';

export default function StoreAssetsPage() {
  const { key } = useStoreOperationScope();
  return <StorePublishingSession key={key} />;
}
function StorePublishingSession() {
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname), navigate = useNavigate();
  const { isCurrent } = useStoreOperationScope();
  const state = useStorePublishing();
  return (
    <div className="space-y-4">
      <StoreLibraryNavigation section="mine" />
      <section className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900" aria-label="게시·활용 안내" >
        <h2 className="font-semibold">게시 설정과 실제 활용을 구분해 확인하세요</h2>
        <p className="mt-2">이 화면은 가져온 사본의 게시 설정입니다. 직접 작성·제작 자료는 자료함에서 관리합니다. 게시됨은 기기 연결이나 재생 완료를 뜻하지 않습니다.</p>
        <nav aria-label="게시 작업 이어가기" className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded-lg border bg-white px-3 py-2" to={`${base}/library/contents`}>자료 선택·편집</Link>
          <Link className="rounded-lg border bg-white px-3 py-2" to={`${base}/workspace/use`}>적용·출력 확인</Link>
          <Link className="rounded-lg border bg-white px-3 py-2" to={base}>내 매장 홈</Link>
        </nav>
      </section>
      {state.actionError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <p>{state.actionError}</p>
        {state.retryCount > 0 && <button type="button" disabled={state.busy} onClick={() => void state.retryFailed()} className="mt-2 underline">실패한 {state.retryCount}건 다시 시도</button>}
      </div>}
      {state.notice && <p role="status" className="text-sm text-teal-800">{state.notice}</p>}
      {state.busy && <p role="status" className="text-sm text-slate-600">게시 설정을 변경하는 중…</p>}
      {!state.loading && !state.error && state.total > state.items.length && <p role="status" className="text-sm text-amber-800">전체 {state.total}건 중 {state.items.length}건을 조회했습니다. 아래 필터와 현황은 조회한 자료 기준입니다.</p>}
      <fieldset disabled={state.busy} aria-busy={state.busy} className="m-0 min-w-0 border-0 p-0">
        <div className="[&>div>div:first-child]:flex-wrap [&>div>div:first-child]:gap-3 [&_.grid-cols-4]:grid-cols-2 sm:[&_.grid-cols-4]:grid-cols-4 [&_.gap-6]:flex-wrap [&_.gap-6]:gap-3 [&_.space-y-1>div]:flex-wrap [&_.space-y-1_button]:shrink-0 [&_.space-y-1_button]:whitespace-nowrap">
          {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
          <StoreAssetsPanel items={state.items} loading={state.loading} error={state.error} updatingId={state.updatingId}
            onRefresh={() => void state.reload()} onToggleStatus={item => void state.toggle(item.id)}
            onBulkStatusChange={state.changeStatus}
            onEdit={id => { if (isCurrent()) navigate(`${base}/content/${id}/edit`); }}
            dashboardPath={base} contentListPath={`${base}/content`} />
        </div>
      </fieldset>
    </div>
  );
}
