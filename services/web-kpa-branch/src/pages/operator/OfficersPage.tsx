/**
 * OfficersPage — 운영자 임원 · 위원회 · TF 명부
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 *
 * 목록 + 등록/수정 폼 + 표시순서 변경. **조직도 편집기가 아니다** — 드래그 트리도,
 * 계층 구조도 만들지 않는다. 임기와 순서만 다룬다.
 *
 * 직책은 RBAC 이 아니므로 이 화면은 권한을 부여하지 않는다.
 * 연락처 입력칸이 없다 — 원장에 컬럼 자체가 없다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listOperatorOfficers,
  createOfficer,
  updateOfficer,
  reorderOfficers,
  OFFICER_STATUS_LABEL,
  OFFICER_VISIBILITY_LABEL,
  type OfficerItem,
  type OfficerStatus,
  type OfficerVisibility,
} from '../../lib/api/branchOfficer';
import { listMemberConsole } from '../../lib/api/memberConsole';
import { describeApiError as describe } from '../../lib/errors';

const STATUS_FILTERS: Array<{ value: '' | OfficerStatus; label: string }> = [
  { value: '', label: '전체' },
  { value: 'active', label: '재임' },
  { value: 'ended', label: '임기종료' },
];

interface Draft {
  userId: string;
  name: string;
  position: string;
  groupName: string;
  termStart: string;
  termEnd: string;
  displayOrder: string;
  visibility: OfficerVisibility;
}

const EMPTY: Draft = {
  userId: '',
  name: '',
  position: '',
  groupName: '',
  termStart: '',
  termEnd: '',
  displayOrder: '0',
  visibility: 'public',
};

function fmt(v: string | null): string {
  return v ? v : '-';
}

export default function OfficersPage({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'' | OfficerStatus>('');
  const [items, setItems] = useState<OfficerItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  /** 계정 연결 후보 — 이 분회 재적 회원. 서버도 같은 조건을 다시 검사한다 */
  const [members, setMembers] = useState<Array<{ userId: string; name: string | null; email: string | null }>>([]);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setListError(null);
    try {
      setItems(await listOperatorOfficers(slug, status || null));
    } catch (e) {
      setItems(null);
      setListError(describe(e));
    }
  }, [slug, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let alive = true;
    // 연결 후보는 실패해도 화면을 막지 않는다 — 외부 인사는 연결 없이 등록할 수 있다
    listMemberConsole(slug, { year: new Date().getFullYear(), status: 'active' })
      .then((r) => alive && setMembers(r.items.map((m) => ({ userId: m.userId, name: m.name, email: m.email }))))
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [slug]);

  function openCreate() {
    setEditId(null);
    setDraft(EMPTY);
    setFormOpen(true);
    setActionError(null);
    setMessage(null);
  }

  function openEdit(o: OfficerItem) {
    setEditId(o.id);
    setDraft({
      userId: o.userId ?? '',
      name: o.name,
      position: o.position,
      groupName: o.groupName ?? '',
      termStart: o.termStart,
      termEnd: o.termEnd ?? '',
      displayOrder: String(o.displayOrder),
      visibility: o.visibility,
    });
    setFormOpen(true);
    setActionError(null);
    setMessage(null);
  }

  async function save() {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const input = {
        userId: draft.userId || null,
        name: draft.name,
        position: draft.position,
        groupName: draft.groupName || null,
        termStart: draft.termStart,
        termEnd: draft.termEnd || null,
        displayOrder: Number(draft.displayOrder || 0),
        visibility: draft.visibility,
      };
      if (editId) {
        await updateOfficer(slug, editId, input);
        setMessage('임원 정보를 저장했습니다.');
      } else {
        await createOfficer(slug, input);
        setMessage('임원을 등록했습니다.');
      }
      setFormOpen(false);
      setEditId(null);
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function endTerm(o: OfficerItem) {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      // 종료일을 비우면 서버가 오늘로 마감한다
      await updateOfficer(slug, o.id, { status: 'ended' });
      setMessage(`${o.name} ${o.position} 임기를 종료했습니다. 재임하실 경우 새로 등록해 주세요.`);
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  /** 한 칸 위/아래로. 두 행의 순서값을 맞바꿔 한 번에 보낸다 */
  async function move(idx: number, dir: -1 | 1) {
    if (!items) return;
    const target = items[idx + dir];
    if (!target) return;
    const cur = items[idx];
    setBusy(true);
    setActionError(null);
    try {
      await reorderOfficers(slug, [
        { id: cur.id, displayOrder: target.displayOrder },
        { id: target.id, displayOrder: cur.displayOrder },
      ]);
      await reload();
    } catch (e) {
      setActionError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">임원 · 위원회</h1>
          <p className="mt-1 text-sm text-gray-500">
            임원·위원회·TF 명부를 관리합니다. 직책은 권한이 아니며 연락처는 저장하지 않습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | OfficerStatus)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            임원 등록
          </button>
        </div>
      </header>

      {actionError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}
      {message && (
        <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>
      )}

      {formOpen && (
        <section className="rounded border border-gray-200">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
            <h2 className="text-sm font-semibold text-gray-800">{editId ? '임원 수정' : '임원 등록'}</h2>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-gray-500">성명 *</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">직책 *</span>
                <input
                  type="text"
                  value={draft.position}
                  onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="회장 · 부회장 · 이사 · 감사 · 위원장"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">소속 (위원회·TF)</span>
                <input
                  type="text"
                  value={draft.groupName}
                  onChange={(e) => setDraft({ ...draft, groupName: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="비우면 임원 본진"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">회원 계정 연결</span>
                <select
                  value={draft.userId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const m = members.find((x) => x.userId === uid);
                    // 연결하면 성명을 채워주되, 저장되는 것은 어디까지나 이 name 값이다
                    setDraft({ ...draft, userId: uid, name: uid && m?.name ? m.name : draft.name });
                  }}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="">연결 안 함 (외부 인사)</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name ?? m.email ?? m.userId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">임기 시작 *</span>
                <input
                  type="date"
                  value={draft.termStart}
                  onChange={(e) => setDraft({ ...draft, termStart: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">임기 종료</span>
                <input
                  type="date"
                  value={draft.termEnd}
                  onChange={(e) => setDraft({ ...draft, termEnd: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">표시순서</span>
                <input
                  type="number"
                  min={0}
                  value={draft.displayOrder}
                  onChange={(e) => setDraft({ ...draft, displayOrder: e.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">공개 범위</span>
                <select
                  value={draft.visibility}
                  onChange={(e) => setDraft({ ...draft, visibility: e.target.value as OfficerVisibility })}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="public">전체 공개</option>
                  <option value="members_only">회원 전용</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditId(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                취소
              </button>
            </div>
          </div>
        </section>
      )}

      {listError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</p>}

      {items === null && !listError ? (
        <p className="text-sm text-gray-500">불러오는 중입니다…</p>
      ) : items && items.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          등록된 임원이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2">순서</th>
                <th className="py-2">성명</th>
                <th className="py-2">직책</th>
                <th className="py-2">소속</th>
                <th className="py-2">임기</th>
                <th className="py-2">공개</th>
                <th className="py-2">상태</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((o, idx) => (
                <tr key={o.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <span className="flex items-center gap-1">
                      <span className="text-gray-500">{o.displayOrder}</span>
                      <button
                        type="button"
                        disabled={busy || idx === 0}
                        onClick={() => void move(idx, -1)}
                        className="text-xs text-gray-400 hover:text-gray-800 disabled:opacity-30"
                        aria-label="위로"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={busy || idx === (items?.length ?? 0) - 1}
                        onClick={() => void move(idx, 1)}
                        className="text-xs text-gray-400 hover:text-gray-800 disabled:opacity-30"
                        aria-label="아래로"
                      >
                        ▼
                      </button>
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="font-medium text-gray-900">{o.name}</div>
                    <div className="text-xs text-gray-500">
                      {o.userId ? (o.linkedMember?.email ?? '회원 연결') : '외부 인사'}
                    </div>
                  </td>
                  <td className="py-2 text-gray-800">{o.position}</td>
                  <td className="py-2 text-gray-600">{fmt(o.groupName)}</td>
                  <td className="py-2 text-gray-600">
                    {o.termStart} ~ {fmt(o.termEnd)}
                  </td>
                  <td className="py-2 text-gray-600">{OFFICER_VISIBILITY_LABEL[o.visibility]}</td>
                  <td className="py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        o.current ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {o.current ? '현직' : OFFICER_STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="flex justify-end gap-2 text-xs">
                      <button type="button" onClick={() => openEdit(o)} className="text-primary-700 hover:underline">
                        수정
                      </button>
                      {o.status === 'active' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void endTerm(o)}
                          className="text-gray-500 hover:text-red-700 disabled:opacity-50"
                        >
                          임기종료
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
