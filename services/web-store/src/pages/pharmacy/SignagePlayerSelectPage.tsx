import { useNavigate, useLocation, Link } from 'react-router-dom';
import { SignagePlayerSelectView } from '@o4o/store-ui-core';
import { fetchStorePlaylists } from '../../api/storePlaylist';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';

/** A display chooses its own playlist. No device registry or cross-window playback state. */
export function SignagePlayerSelectPage({ selection = false }: Readonly<{ selection?: boolean }>) {
  const scope = useStoreOperationScope();
  return <DisplaySelection key={scope.key} selection={selection} />;
}

function DisplaySelection({ selection }: Readonly<{ selection: boolean }>) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const displayPath = `${base}/marketing/signage/display`;
  return <main className="mx-auto w-full max-w-5xl space-y-4 p-4">
    <nav aria-label="사이니지 업무" className="flex flex-wrap gap-2 text-sm">
      <Link className="min-h-11 content-center rounded-lg border px-3" to={`${base}/marketing/signage/videos`}>동영상 보관함</Link>
      <Link className="min-h-11 content-center rounded-lg border px-3" to={`${base}/marketing/signage/playlist`}>재생목록</Link>
      <span aria-current="page" className="min-h-11 content-center rounded-lg bg-teal-50 px-3">디스플레이 재생</span>
    </nav>
    {selection ? <SignagePlayerSelectView fetchStorePlaylists={fetchStorePlaylists}
      playButtonClassName="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-sm text-white hover:bg-teal-800"
      searchInputClassName="w-full min-h-11 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-teal-500"
      playPathPrefix={`${base}/marketing/signage/play`}
      onPlay={id => navigate(`${base}/marketing/signage/play/${encodeURIComponent(id)}`)} />
      : <section className="space-y-4 rounded-xl border bg-white p-5">
        <h1 className="text-xl font-semibold">디스플레이 재생</h1>
        <p>재생할 디스플레이의 브라우저에서 재생 화면을 열고 게시된 재생목록을 선택하시기 바랍니다.</p>
        <a href={displayPath} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-white">재생 화면 열기</a>
        <p className="text-sm text-slate-600">새 탭은 이 버튼을 누른 기기에서 열립니다. 다른 TV를 원격으로 켜거나 제어하지 않습니다.</p>
        <p className="text-sm text-slate-600">화면마다 다른 목록을 선택할 수 있습니다. 선택 후 재생 주소를 복사해 다른 기기에서 열 수 있으며, 목록 선택에는 매장 로그인이 필요합니다.</p>
      </section>}
  </main>;
}
