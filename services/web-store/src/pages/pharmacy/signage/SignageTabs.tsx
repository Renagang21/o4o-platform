import { Link } from 'react-router-dom';
import { withWorkspaceMode } from '../../../config/storeWorkspace';

export type SignageTabKey = 'videos' | 'playlists' | 'player';

/** 사이니지 업무 탭. 화면 제목과 같은 이름(동영상 · 재생목록 · 디스플레이 재생)을 쓴다. */
export function SignageTabs({ base, active }: Readonly<{ base: string; active: SignageTabKey }>) {
  const tabs: ReadonlyArray<{ key: SignageTabKey; label: string; to: string }> = [
    { key: 'videos', label: '동영상', to: withWorkspaceMode(`${base}/marketing/signage/videos`, 'studio') },
    { key: 'playlists', label: '재생목록', to: withWorkspaceMode(`${base}/marketing/signage/playlist`, 'studio') },
    { key: 'player', label: '디스플레이 재생', to: `${base}/marketing/signage/player` },
  ];
  return (
    <nav aria-label="사이니지 업무" className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to}
          aria-current={active === tab.key ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium ${
            active === tab.key
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
