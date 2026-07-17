/**
 * TabletCornerSwapModal — 코너 "화면 바꾸기" (1동작 교체)
 *
 * WO-O4O-KPA-TABLET-STORE-UX-AND-SAMPLE-GUIDE-FIX-V1 §2
 *   근무자 관점: 코너 카드의 [화면 바꾸기] → 이 코너에서 쓸 화면 목록.
 *   - 현재 화면은 '지금 사용 중'.
 *   - 다른 화면은 [이 화면으로 바꾸기] 한 번으로 끝.
 *   - '연결 후 적용' 2단계 없음: applyCurrentScreenSet 이 연결 보장 + current 적용을 원자적으로 처리
 *     (api/tabletDisplays.ts 계약). 미리 연결 안 된 화면도 검색해 바로 사용 가능(연결은 시스템이 수행).
 *   - 내부 용어(Screen Set/current/연결/블록) 미노출 — 화면 이름 + 쉬운 라벨만.
 *   - 되돌리기는 상위 토스트에서만 제공(onApplied 가 prev id 를 함께 전달).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, X, Check, Search } from 'lucide-react';
import {
  fetchCornerContents, fetchScreenSets, applyCurrentScreenSet,
  type CornerContent, type ScreenSet,
} from '../../api/tabletDisplays';
import { templateLabel } from './TabletScreenSetManager';

type Toast = { type: 'success' | 'error'; message: string; action?: { label: string; onClick: () => void } };

interface Props {
  tabletId: string;
  cornerName: string;
  onClose: () => void;
  /** 적용 성공 시 상위 동기화(새 current id + 직전 current id + 새 화면 이름 → 상위가 되돌리기 토스트 표시). */
  onApplied: (newId: string, prevId: string | null, newName: string) => void;
  onToast: (t: Toast) => void;
}

export default function TabletCornerSwapModal({ tabletId, cornerName, onClose, onApplied, onToast }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CornerContent[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  // '다른 화면 골라 넣기' — 이 코너에 아직 없는 화면 검색.
  const [showOthers, setShowOthers] = useState(false);
  const [allSets, setAllSets] = useState<ScreenSet[] | null>(null);
  const [loadingOthers, setLoadingOthers] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, currentScreenSetId } = await fetchCornerContents(tabletId);
      setItems(items);
      setCurrentId(currentScreenSetId);
    } catch {
      onToast({ type: 'error', message: '화면 목록을 불러오지 못했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [tabletId, onToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const apply = useCallback(async (screenSetId: string, name: string) => {
    if (applyingId) return;
    const prevId = currentId;
    setApplyingId(screenSetId);
    try {
      await applyCurrentScreenSet(tabletId, screenSetId);
      setCurrentId(screenSetId);
      // 성공 토스트(+되돌리기)는 상위 onApplied 가 표시한다 — 여기서 onToast 를 또 부르면 되돌리기 토스트를 덮어쓴다.
      onApplied(screenSetId, prevId, name);
      onClose();
    } catch (e: any) {
      onToast({ type: 'error', message: e?.message || '화면을 바꾸지 못했습니다.' });
    } finally {
      setApplyingId(null);
    }
  }, [applyingId, currentId, tabletId, cornerName, onApplied, onToast, onClose]);

  const openOthers = useCallback(async () => {
    setShowOthers(true);
    if (allSets) return;
    setLoadingOthers(true);
    try {
      setAllSets(await fetchScreenSets());
    } catch {
      onToast({ type: 'error', message: '다른 화면 목록을 불러오지 못했습니다.' });
      setAllSets([]);
    } finally {
      setLoadingOthers(false);
    }
  }, [allSets, onToast]);

  // 이 코너에 아직 연결되지 않은 화면(검색 대상).
  const connectedIds = useMemo(() => new Set(items.map((i) => i.screenSetId)), [items]);
  const otherSets = useMemo(() => {
    const list = (allSets ?? []).filter((s) => !connectedIds.has(s.id) && s.status !== 'archived');
    const q = query.trim().toLowerCase();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  }, [allSets, connectedIds, query]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.5)' }}
      className="flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[86vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-teal-600">화면 바꾸기</div>
            <h3 className="text-base font-bold text-slate-800 truncate">{cornerName}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> <span className="ml-2 text-sm">불러오는 중…</span>
            </div>
          ) : (
            <>
              {items.length === 0 && !showOthers && (
                <p className="text-sm text-slate-500 py-4 text-center">
                  이 코너에 준비된 화면이 아직 없습니다. 아래에서 화면을 골라 바로 사용할 수 있습니다.
                </p>
              )}

              {items.map((it) => {
                const isCurrent = it.screenSetId === currentId;
                return (
                  <div
                    key={it.screenSetId}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                      isCurrent ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{it.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{templateLabel(it.templateKey)}</div>
                    </div>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 flex-shrink-0">
                        <Check className="w-4 h-4" /> 지금 사용 중
                      </span>
                    ) : (
                      <button
                        onClick={() => apply(it.screenSetId, it.name)}
                        disabled={!!applyingId}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                      >
                        {applyingId === it.screenSetId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        이 화면으로 바꾸기
                      </button>
                    )}
                  </div>
                );
              })}

              {/* 다른 화면 골라 넣기 */}
              {!showOthers ? (
                <button
                  onClick={openOthers}
                  className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-teal-700 bg-white border border-dashed border-teal-300 rounded-xl hover:bg-teal-50"
                >
                  + 다른 화면 골라 넣기
                </button>
              ) : (
                <div className="mt-2 pt-3 border-t space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="화면 이름으로 찾기"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {loadingOthers ? (
                    <div className="flex items-center justify-center py-6 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> <span className="ml-2 text-sm">불러오는 중…</span>
                    </div>
                  ) : otherSets.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">사용할 수 있는 다른 화면이 없습니다.</p>
                  ) : (
                    <div className="max-h-[40vh] overflow-y-auto space-y-1.5">
                      {otherSets.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{templateLabel(s.templateKey)}</div>
                          </div>
                          <button
                            onClick={() => apply(s.id, s.name)}
                            disabled={!!applyingId}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                          >
                            {applyingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            이 화면으로 바꾸기
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
