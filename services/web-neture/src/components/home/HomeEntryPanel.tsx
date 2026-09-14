/**
 * HomeEntryPanel — O4O 대표 홈(로그인 후) 개인화 영역
 *
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1
 *
 * 섹션: 주요 업무 / 내가 이용하는 서비스 / 가입·이용 상태 / 가입 가능한 서비스.
 * 판정 · 데이터는 전부 `lib/home-entry.ts` — 이 컴포넌트는 표시와 버튼 동작만 맡는다.
 *
 * 상태 3종: 로딩(자리표시) · 오류(재시도 — "미가입" 으로 보이지 않게 한다) · 정상.
 * 알림 · KPI · 유료 권한 같은 만들어낸 정보는 없다.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react';
import type { User } from '../../contexts/AuthContext';
import {
  buildHomeEntryModel,
  openServiceEntry,
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
  if (action.kind === 'internal') {
    return (
      <Link to={action.to} className={BTN}>
        {item.label}
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
      </Link>
    );
  }
  if (action.kind === 'public') {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={BTN}>
        {item.label}
        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </a>
    );
  }
  const busy = busyId === item.id;
  return (
    <button type="button" className={BTN} disabled={busyId !== null} onClick={() => onHandoff(item)}>
      {item.label}
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

export default function HomeEntryPanel({ user, data, loading, error, onReload }: HomeEntryPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const handleHandoff = async (item: EntryItem) => {
    if (item.action.kind !== 'handoff') return;
    setBusyId(item.id);
    setMoveError(null);
    try {
      await openServiceEntry(item.action.serviceKey, item.action.returnPath);
      // 성공 시 현재 탭이 대상 서비스로 이동한다 — busy 는 풀지 않는다.
    } catch (err) {
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
  const nothingToShow =
    model.groups.length === 0 && model.myServices.length === 0 && model.statusItems.length === 0 && model.joinable.length === 0;

  return (
    <div className="mt-10 w-full max-w-2xl text-left">
      {moveError && (
        <p className="m-0 mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {moveError}
        </p>
      )}

      {model.groups.length > 0 && (
        <Section title="주요 업무">
          <div className="flex flex-col gap-3">
            {model.groups.map((group) => (
              <div key={group.id}>
                <p className="m-0 mb-1.5 text-sm text-slate-500">{group.title}</p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />
                  ))}
                </div>
                {group.items.some((i) => i.note) && (
                  <ul className="m-0 mt-1.5 list-none p-0 text-xs text-slate-400">
                    {group.items
                      .filter((i) => i.note)
                      .map((i) => (
                        <li key={i.id}>
                          {i.label}: {i.note}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {model.myServices.length > 0 && (
        <Section title="내가 이용하는 서비스">
          <div className="flex flex-wrap gap-2">
            {model.myServices.map((item) => (
              <EntryButton key={item.id} item={item} busyId={busyId} onHandoff={handleHandoff} />
            ))}
          </div>
        </Section>
      )}

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

      {nothingToShow && (
        <p className="m-0 text-sm text-slate-400">지금 이용 중이거나 가입할 수 있는 서비스가 없습니다.</p>
      )}
    </div>
  );
}
