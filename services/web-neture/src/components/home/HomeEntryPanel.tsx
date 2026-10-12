/**
 * HomeEntryPanel — O4O 대표 홈(로그인 후) 개인화 영역
 *
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1
 *
 * 섹션: 내 업무 공간(4 카드) / 플랫폼 관리(해당 사용자만) / 내 서비스 / (newsSlot: O4O 서비스 소식) /
 * 가입·이용 상태 / 가입 가능한 서비스.
 * 판정 · 데이터는 전부 `lib/home-entry.ts` — 이 컴포넌트는 표시와 버튼 동작만 맡는다.
 * WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1: `newsSlot` 은 업무 공간 · 내 서비스 아래,
 * 가입 · 이용 상태 위에 놓인다 — 업무 진입이 소식 목록에 밀리지 않도록 한다.
 *
 * WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1: "내 업무 공간" 은 4대 Role Workspace 카드
 * (커뮤니티 · 매장 · 공급자 · 서비스 운영) — 데스크톱 2열 · 모바일 1열. 카드 = 제목 / 짧은 설명 /
 * 실제 사용 가능한 진입 버튼만. 색 · 아이콘 · KPI 없음. 서비스별 "매장 HUB / 내 매장" 반복 나열 없음.
 * Platform Admin 은 카드에 섞지 않고 "플랫폼 관리" 로 분리한다.
 *
 * 상태 3종: 로딩(자리표시) · 오류(재시도 — "미가입" 으로 보이지 않게 한다) · 정상.
 * 알림 · KPI · 유료 권한 같은 만들어낸 정보는 없다.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MyHomeUnread } from '../mypage/MyHomePanels';
import { Loader2, ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react';
import type { User } from '../../contexts/AuthContext';
import {
  buildHomeEntryModel,
  resolveServiceEntryUrl,
  ServiceEntryError,
  type EntryItem,
  type HomeEntryData,
} from '../../lib/home-entry';

interface HomeEntryPanelProps {
  user: User;
  data: HomeEntryData | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  /** 「O4O 서비스 소식」 섹션 — 내 서비스 아래 · 가입 · 이용 상태 위 */
  newsSlot?: React.ReactNode;
  summary?: boolean;
  /** My Home shows only workspaces the current account can actually enter. */
  workspaceOnly?: boolean;
  /** My Home overview: one entry per populated role, with details in services. */
  compactWorkspace?: boolean;
  /** A selected store's original workspace, using the existing server-owned entries. */
  storeOrganizationId?: string;
}

const BTN =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 no-underline ' +
  'transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60';

function EntryButton({
  item,
  busyId,
  onHandoff,
}: {
  item: EntryItem;
  busyId: string | null;
  onHandoff: (item: EntryItem) => void;
}) {
  const { action } = item;
  // 보조 정보(서비스 이름 · 관리자)는 버튼 안의 작은 회색 글자 — 별도 목록으로 반복하지 않는다.
  const text = (
    <>
      {item.label}
      {item.note && <span className="text-xs text-slate-400">{item.note}</span>}
    </>
  );
  if (action.kind === 'internal') {
    return (
      <Link to={action.to} className={BTN}>
        {text}
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
      </Link>
    );
  }
  if (action.kind === 'public') {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={BTN}>
        {text}
        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </a>
    );
  }
  const busy = busyId === item.id;
  return (
    <button type="button" className={BTN} disabled={busyId !== null} onClick={() => onHandoff(item)}>
      {text}
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="m-0 mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

export default function HomeEntryPanel({ user, data, loading, error, onReload, newsSlot, summary, workspaceOnly, compactWorkspace, storeOrganizationId }: HomeEntryPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  // 이동 세대(generation). 이동 시작마다 1 증가하고, 뒤로가기(bfcache) 복원 시에도 1 증가한다.
  // 복원 이전에 시작된 요청은 세대가 달라져 늦게 도착해도 이동시키지 않는다.
  const handoffGeneration = useRef(0);

  useEffect(() => {
    handoffGeneration.current += 1;
    setBusyId(null);
    setMoveError(null);
    return () => { handoffGeneration.current += 1; };
  }, [user.id, storeOrganizationId, data]);

  // WO-O4O-NETURE-HOME-BACK-NAVIGATION-BUSY-STATE-FIX-V1
  // 서비스로 이동한 뒤 브라우저 뒤로가기로 돌아오면 브라우저가 페이지를 bfcache 에서 복원하여
  // 이동 직전의 busyId(모래시계 · 전 버튼 disabled) 가 그대로 남는다. `pageshow` 는 복원 시에도
  // 발생하므로 여기서만 이동 중 상태를 푼다. 소식 · AI · 스크롤 등 다른 화면 상태는 건드리지 않는다.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return; // 최초 로드 · 새로고침은 상태가 이미 초기값이다
      handoffGeneration.current += 1;
      setBusyId(null);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const handleHandoff = async (item: EntryItem) => {
    if (item.action.kind !== 'handoff') return;
    if (busyId !== null) return; // 정상 이동 중 중복 클릭 방지 (버튼 disabled 와 이중 방어)
    const generation = ++handoffGeneration.current;
    setBusyId(item.id);
    setMoveError(null);
    try {
      const targetUrl = await resolveServiceEntryUrl(item.action.serviceKey, item.action.returnPath);
      if (generation !== handoffGeneration.current) return; // 복원 이후 늦게 도착한 응답 — 재이동하지 않는다
      // 성공 시 현재 탭이 대상 서비스로 이동한다 — busy 는 pageshow(복원) 에서 푼다.
      window.location.assign(targetUrl);
    } catch (err) {
      if (generation !== handoffGeneration.current) return;
      setMoveError(err instanceof ServiceEntryError ? err.message : '서비스로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="mt-10 w-full max-w-2xl text-left" aria-busy="true">
        <p className="m-0 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          이용 중인 서비스를 확인하는 중...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-10 w-full max-w-2xl text-left">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="m-0">{error ?? '이용 중인 서비스 정보를 불러오지 못했습니다.'}</p>
          <p className="m-0 mt-1 text-amber-700">가입 여부와 무관한 일시적 오류일 수 있습니다.</p>
          <button
            type="button"
            onClick={onReload}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-900 hover:border-amber-500"
          >
            <RefreshCw className="h-3 w-3" />
            다시 불러오기
          </button>
        </div>
      </div>
    );
  }

  const model = buildHomeEntryModel(user, data);
  const hasWorkspaceEntry = model.groups.some((g) => g.items.length > 0);
  const nothingToShow =
    !hasWorkspaceEntry && !model.platformAdmin && model.myServices.length === 0 && model.statusItems.length === 0 && model.joinable.length === 0;

  if (workspaceOnly) {
    const groups = model.groups.map(group => ({
      ...group,
      items: storeOrganizationId
        ? group.id === 'store'
          ? group.items.filter(item => data.stores.some(store =>
              store.organizationId === storeOrganizationId &&
              item.id === `store:${store.organizationId}:${store.serviceKey}`))
          : []
        : group.items,
    })).filter(group => group.items.length > 0);
    return <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label={storeOrganizationId ? '선택 매장 업무 바로가기' : '내 업무 바로가기'}>
      <h2 className="text-lg font-semibold">{storeOrganizationId ? '내 매장 업무' : '내 업무 바로가기'}</h2>
      {storeOrganizationId && <p className="mt-2 text-sm text-slate-600">선택한 매장의 협력 사업과 운영 업무는 내 매장 업무 공간에서 이어갈 수 있습니다.</p>}
      {storeOrganizationId && new Set(data.stores.map(store => store.organizationId)).size > 1 && <p className="mt-2 text-sm text-slate-600">매장이 여러 곳이면 이동한 매장 관리 화면에서 매장을 다시 선택해 주세요.</p>}
      {moveError && <p role="alert" className="mt-3 text-sm text-red-700">{moveError}</p>}
      {groups.length > 0 ? <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {groups.map(group => <div key={group.id}>
          <h3 className="text-sm font-medium text-slate-600">{group.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">{(compactWorkspace ? group.items.slice(0, 1) : group.items).map(item => <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />)}</div>
        </div>)}
      </div> : <p className="mt-3 text-sm text-slate-500">현재 바로 이동할 수 있는 업무가 없습니다. 참여 서비스에서 이용 상태를 확인해 주세요.</p>}
      {!storeOrganizationId && !compactWorkspace && model.statusItems.length > 0 && <ul className="mt-4 space-y-2 text-sm" aria-label="가입·이용 상태">
        {model.statusItems.map(item => <li key={item.id} className="flex flex-wrap gap-2"><span>{item.serviceName}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{item.statusLabel}</span></li>)}
      </ul>}
      {compactWorkspace && (groups.reduce((total, group) => total + group.items.length, 0) > groups.length || model.statusItems.length > 0) && <p className="mt-3 text-xs text-slate-500">
        {groups.reduce((count, group) => count + group.items.length, 0) > groups.length && "추가 업무는 참여 서비스에서 확인할 수 있습니다. "}
        {model.statusItems.length > 0 && `가입·이용 상태 ${model.statusItems.length}건을 참여 서비스에서 확인하세요.`}
      </p>}
      <Link to="/mypage/services" className="mt-4 inline-block text-sm text-blue-700 underline">참여 서비스와 이용 상태 보기 →</Link>
    </section>;
  }

  if (summary) {
    const available = model.groups.flatMap(group => group.items);
    return <section className="mt-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-left" aria-labelledby="home-my-home-title">
      <div className="flex items-center justify-between gap-3"><h2 id="home-my-home-title" className="text-lg font-semibold">My Home</h2><Link to="/mypage" className="text-sm text-blue-700 underline">모아보기 →</Link></div>
      <MyHomeUnread accountId={user.id} />
      <p className="mt-2 text-sm text-slate-600">참여 서비스 {model.myServices.length}개 · 내 매장 {new Set(data.stores.map(store => store.organizationId)).size}개</p>
      {model.statusItems.length > 0 && <p className="mt-2 text-sm text-amber-800">{model.statusItems.map(item => `${item.serviceName}: ${item.statusLabel}`).join(' · ')}</p>}
      {moveError && <p role="alert" className="mt-3 text-sm text-red-700">{moveError}</p>}
      {available.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{available.slice(0, 4).map(item => <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />)}</div>}
      <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link to="/mypage/services" className="text-blue-700 underline">참여 서비스 이어가기</Link><Link to="/mypage/activity" className="text-blue-700 underline">커뮤니티 활동</Link><Link to="/mypage/management" className="text-blue-700 underline">경영 현황</Link></div>
    </section>;
  }

  return (
    <div className="mt-10 w-full max-w-2xl text-left">
      {moveError && (
        <p className="m-0 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {moveError}
        </p>
      )}

      {/* 내 업무 공간 — 4대 Role Workspace 카드. 항목이 없는 카드도 자리를 지킨다 (진입 버튼만 없다). */}
      <Section title="내 업무 공간">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {model.groups.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`home-workspace-${group.id}`}
              data-workspace={group.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
            >
              <h3 id={`home-workspace-${group.id}`} className="m-0 text-sm font-semibold text-slate-900">
                {group.title}
              </h3>
              <p className="m-0 mt-0.5 text-xs text-slate-500">{group.description}</p>
              {group.items.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />
                  ))}
                </div>
              ) : (
                <p className="m-0 mt-3 text-xs text-slate-400">이용 중인 항목이 없습니다.</p>
              )}
            </section>
          ))}
        </div>
      </Section>

      {/* 플랫폼 관리 — Platform Admin 만. Service Operator 카드와 섞지 않는다. */}
      {model.platformAdmin && (
        <Section title="플랫폼 관리">
          <div className="flex flex-wrap gap-2">
            <EntryButton item={model.platformAdmin} busyId={busyId} onHandoff={handleHandoff} />
          </div>
        </Section>
      )}

      {model.myServices.length > 0 && (
        <Section title="내 서비스">
          <div className="flex flex-wrap gap-2">
            {model.myServices.map((item) => (
              <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />
            ))}
          </div>
        </Section>
      )}

      {newsSlot && <div className="mt-6 first:mt-0">{newsSlot}</div>}

      {model.statusItems.length > 0 && (
        <Section title="가입 · 이용 상태">
          <ul className="m-0 list-none p-0 text-sm text-slate-700">
            {model.statusItems.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
                <span>{s.serviceName}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.statusLabel}</span>
                {s.guide &&
                  (s.guide.href.startsWith('/') ? (
                    <Link to={s.guide.href} className="text-xs text-slate-500 underline hover:text-slate-800">
                      {s.guide.label}
                    </Link>
                  ) : (
                    <a
                      href={s.guide.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 underline hover:text-slate-800"
                    >
                      {s.guide.label}
                    </a>
                  ))}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {model.joinable.length > 0 && (
        <Section title="가입 가능한 서비스">
          <div className="flex flex-wrap gap-2">
            {model.joinable.map((item) => (
              <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />
            ))}
          </div>
        </Section>
      )}

      {nothingToShow && !newsSlot && (
        <p className="m-0 text-sm text-slate-400">지금 이용 중이거나 가입할 수 있는 서비스가 없습니다.</p>
      )}
    </div>
  );
}
