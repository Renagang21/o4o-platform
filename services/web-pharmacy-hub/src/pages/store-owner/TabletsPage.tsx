/**
 * TabletsPage (약국 경영자) — 태블릿 · 화면 세트
 *
 * WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1
 *
 * 기존 O4O 태블릿 모델을 그대로 따른다 — 신규 태블릿 콘텐츠 모델을 만들지 않는다.
 *   태블릿(위치 단위) → 여러 화면 세트 저장 → 그중 하나를 '적용'
 *   적용 해제해도 세트는 저장된 화면으로 남는다(보관과 다름).
 *
 * 화면 세트 제작은 공유 편집기 `TabletContentStepBuilder` 를 **그대로 주입해서** 쓴다.
 * KPA 화면을 복사하지 않았고, Pharmacy-Hub 전용 편집기도 만들지 않았다.
 */

import { useCallback, useEffect, useState } from 'react';
import { TabletContentStepBuilder, type ScreenSet, type ScreenSetDetail } from '@o4o/tablet-screen-set-editor';
import {
  fetchTablets,
  createTablet,
  updateTablet,
  deactivateTablet,
  applyCurrentScreenSet,
  clearCurrentScreenSet,
  fetchScreenSets,
  fetchScreenSetDetail,
  archiveScreenSet,
  fetchScreenSetProductPool,
  pharmacyHubScreenSetApi,
  isTabletActive,
  type StoreTablet,
} from '../../lib/api/pharmacyHubTablet';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

/** 매장 미연결·모호는 공통 라우터가 409 로 내려준다 — 그 코드로 안내 상태를 만든다. */
function connectionFromError(e: any): StoreConnectionState | null {
  const code = e?.response?.data?.code ?? e?.code;
  if (code === 'STORE_NOT_CONNECTED') return { status: 'not_connected', candidateCount: 0 };
  if (code === 'AMBIGUOUS_STORE_CONNECTION') return { status: 'ambiguous', candidateCount: 2 };
  return null;
}

export default function StoreOwnerTabletsPage() {
  const [tablets, setTablets] = useState<StoreTablet[]>([]);
  const [screenSets, setScreenSets] = useState<ScreenSet[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ detail: ScreenSetDetail | null } | null>(null);
  const [creatingTablet, setCreatingTablet] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchTablets(), fetchScreenSets()])
      .then(([t, s]) => {
        // 목록은 내린 태블릿도 함께 오므로 화면에서 제외한다(soft delete 계약).
        setTablets(t.filter(isTabletActive));
        setScreenSets(s);
        setConnection({ status: 'connected', candidateCount: 1 });
        setError(null);
      })
      .catch((e: any) => {
        const conn = connectionFromError(e);
        if (conn) {
          setConnection(conn);
          setTablets([]);
          setScreenSets([]);
          setError(null);
        } else {
          setError(e?.message || '태블릿 정보를 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * 적용 가능한 화면 세트 = status 'active' 만.
   * 서버가 draft 적용을 409(SCREEN_SET_NOT_ACTIVE)로 막으므로, 고를 수 없는 것을 목록에
   * 올려두고 실패시키지 않는다(실측으로 확인한 제약).
   */
  const applicableSets = screenSets.filter((s) => s.status === 'active');

  const act = async (fn: () => Promise<unknown>, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      await fn();
      load();
    } catch (e: any) {
      window.alert(e?.response?.data?.error?.message || e?.message || '처리하지 못했습니다.');
    }
  };

  const openEditor = async (id?: string) => {
    try {
      setEditing({ detail: id ? await fetchScreenSetDetail(id) : null });
    } catch (e: any) {
      window.alert(e?.message || '화면 세트를 불러오지 못했습니다.');
    }
  };

  // ── 화면 세트 제작기 (공유 편집기 주입) ──
  if (editing) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <TabletContentStepBuilder
          initialDetail={editing.detail}
          api={pharmacyHubScreenSetApi}
          fetchProductPool={fetchScreenSetProductPool}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onToast={(t) => {
            // 편집기는 앱 전역 toast singleton 에 의존하지 않는다 — 여기서 표면을 정한다.
            if (t?.type === 'error') window.alert(t.message);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">태블릿</h1>
          <p className="mt-1 text-sm text-gray-500">
            매장에 둘 태블릿을 등록하고, 화면 세트를 만들어 원하는 것을 적용합니다.
          </p>
        </div>
        {connection?.status === 'connected' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditor()}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              화면 세트 만들기
            </button>
            <button
              type="button"
              onClick={() => setCreatingTablet(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              태블릿 등록
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="매장 태블릿" />
      ) : loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : (
        <>
          {/* ── 태블릿 ── */}
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">등록된 태블릿</h2>
            {tablets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
                <p className="text-sm font-medium text-gray-600">등록된 태블릿이 없습니다.</p>
                <p className="mt-2 text-sm text-gray-400">
                  "태블릿 등록" 으로 매장에 둘 기기를 위치별로 추가하세요.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {tablets.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        {t.location && <span>{t.location}</span>}
                        {t.currentScreenSetId ? (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">
                            적용 중: {screenSets.find((s) => s.id === t.currentScreenSetId)?.name ?? '화면 세트'}
                          </span>
                        ) : (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">미적용</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                      {applicableSets.length > 0 && (
                        <select
                          aria-label={`${t.name} 화면 세트 적용`}
                          value={t.currentScreenSetId ?? ''}
                          onChange={(e) =>
                            act(() =>
                              e.target.value
                                ? applyCurrentScreenSet(t.id, e.target.value)
                                : clearCurrentScreenSet(t.id),
                            )
                          }
                          className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                        >
                          <option value="">— 적용 안 함 —</option>
                          {applicableSets.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const name = window.prompt('태블릿 이름', t.name);
                          if (name && name.trim()) act(() => updateTablet(t.id, { name: name.trim() }));
                        }}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        이름 수정
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          act(
                            () => deactivateTablet(t.id),
                            `"${t.name}" 태블릿을 목록에서 내릴까요? 저장된 화면 세트는 남습니다.`,
                          )
                        }
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        내리기
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── 화면 세트 ── */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">저장된 화면 세트</h2>
            {screenSets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
                <p className="text-sm font-medium text-gray-600">저장된 화면 세트가 없습니다.</p>
                <p className="mt-2 text-sm text-gray-400">
                  "화면 세트 만들기" 로 태블릿에 띄울 화면을 구성하세요. 여러 개를 만들어 두고 필요할 때 바꿔 적용할 수 있습니다.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {screenSets.map((s) => {
                  const appliedTo = tablets.filter((t) => t.currentScreenSetId === s.id);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                            {s.status === 'active' ? '적용 가능' : s.status === 'draft' ? '작성 중' : s.status}
                          </span>
                          {s.status === 'draft' && <span>제작을 마치면 태블릿에 적용할 수 있습니다.</span>}
                          {appliedTo.length > 0 && (
                            <span className="text-green-700">
                              적용 중 · {appliedTo.map((t) => t.name).join(', ')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditor(s.id)}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              () => archiveScreenSet(s.id),
                              appliedTo.length > 0
                                ? `"${s.name}" 은 적용 중입니다. 먼저 적용을 해제해야 보관할 수 있습니다.`
                                : `"${s.name}" 화면 세트를 보관할까요? 태블릿에 연결돼 있으면 먼저 연결을 해제해야 합니다.`,
                            )
                          }
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          보관
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {creatingTablet && (
        <CreateTabletDialog
          onClose={() => setCreatingTablet(false)}
          onCreated={() => {
            setCreatingTablet(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateTabletDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('태블릿 이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTablet({ name: name.trim(), location: location.trim() || undefined });
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || '등록하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label="태블릿 등록"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">태블릿 등록</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-tablet-name">
              이름
            </label>
            <input
              id="ph-tablet-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 카운터 앞 태블릿"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-tablet-loc">
              위치 (선택)
            </label>
            <input
              id="ph-tablet-loc"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 조제실 옆"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '등록 중…' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
