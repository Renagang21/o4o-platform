/**
 * AdminSemiFranchisePage — 세미프랜차이즈 관리 (/admin/semi-franchises)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-2
 *   세미프랜차이즈 = 데이터 행. 생성(행 + 운영 조직) · 이름/상태/커뮤니티 연결 수정 · 담당 운영자 지정/해제.
 *   담당 지정은 이미 Neture 운영자 role 을 가진 사용자만(API 판정).
 *   결제 수취 주체 키는 사업 결정(D1) 전이라 미정 — 화면이 값을 미리 채우지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';
import { neturePharmacyAdminApi as api, formatDateTime, type SemiFranchise } from './api';
import { INPUT, Message, PageHeader, StatusBadge } from './PharmacyCommerceUi';

type Msg = { type: 'success' | 'error'; text: string } | null;

interface EditForm {
  name: string;
  status: 'active' | 'closed';
  communityKey: string;
  paymentReceiverKey: string;
  registrationConditions: string;
}

export default function AdminSemiFranchisePage() {
  const [items, setItems] = useState<SemiFranchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState({ key: '', name: '', communityKey: '', registrationConditions: '' });
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', status: 'active', communityKey: '', paymentReceiverKey: '', registrationConditions: '' });
  const [operatorInput, setOperatorInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await api.listSemiFranchises()) ?? []);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: 'success', text: success });
      await load();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const ok = await act(
      () =>
        api.createSemiFranchise({
          key: createForm.key.trim(),
          name: createForm.name.trim(),
          communityKey: createForm.communityKey.trim() || undefined,
          registrationConditions: createForm.registrationConditions.trim(),
        }),
      '세미프랜차이즈를 만들었습니다.',
    );
    if (ok) setCreateForm({ key: '', name: '', communityKey: '', registrationConditions: '' });
  };

  const startEdit = (sf: SemiFranchise) => {
    setEditKey(sf.key);
    setEditForm({
      name: sf.name,
      status: sf.status,
      communityKey: sf.community_key ?? '',
      paymentReceiverKey: sf.payment_receiver_key ?? '',
      registrationConditions: sf.registration_conditions ?? '',
    });
  };

  const saveEdit = async (sf: SemiFranchise) => {
    const patch: Parameters<typeof api.updateSemiFranchise>[1] = {
      name: editForm.name.trim(),
      status: editForm.status,
      communityKey: editForm.communityKey.trim() || null,
      registrationConditions: editForm.registrationConditions.trim(),
    };
    // 수취 주체 키는 바뀐 경우에만 보낸다(빈 값 = 미정으로 되돌림).
    if ((sf.payment_receiver_key ?? '') !== editForm.paymentReceiverKey.trim()) {
      patch.paymentReceiverKey = editForm.paymentReceiverKey.trim() || null;
    }
    const ok = await act(() => api.updateSemiFranchise(sf.key, patch), '저장했습니다.');
    if (ok) setEditKey(null);
  };

  const assign = async (sf: SemiFranchise) => {
    const userId = (operatorInput[sf.key] ?? '').trim();
    if (!userId) return;
    const ok = await act(() => api.assignOperator(sf.key, userId), '담당 운영자를 지정했습니다.');
    if (ok) setOperatorInput((prev) => ({ ...prev, [sf.key]: '' }));
  };

  const revoke = async (sf: SemiFranchise, userId: string) => {
    if (!window.confirm(`담당 운영자(${userId})를 해제할까요?`)) return;
    await act(() => api.revokeOperator(sf.key, userId), '담당 운영자를 해제했습니다.');
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="세미프랜차이즈 관리"
        description="세미프랜차이즈를 만들고, 담당 운영자를 지정합니다. 담당 운영자는 Neture 운영자 역할이 있는 사용자만 지정할 수 있습니다."
      />

      <Message message={message} />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">새 세미프랜차이즈</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className={INPUT}
            placeholder="key (영문 소문자 · 숫자 · -)"
            value={createForm.key}
            onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="이름"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <input
            className={INPUT}
            placeholder="커뮤니티 key (선택)"
            value={createForm.communityKey}
            onChange={(e) => setCreateForm({ ...createForm, communityKey: e.target.value })}
          />
          <textarea aria-label="서비스 가입 조건" className={INPUT} maxLength={4000} placeholder="운영자와 협의한 가입 조건" value={createForm.registrationConditions} onChange={(e) => setCreateForm({ ...createForm, registrationConditions: e.target.value })} />
          <button
            type="button"
            disabled={busy || !createForm.key.trim() || !createForm.name.trim()}
            onClick={create}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            만들기
          </button>
        </div>
      </section>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        결제 수취 주체(실제 수취인 · PG 연동)는 아직 정해지지 않았습니다. 수취 주체 키는 사업 결정이 내려진 뒤에만 입력하세요.
        비어 있으면 세미프랜차이즈별 &lsquo;미정&rsquo;으로 따로 묶이고, 결제는 테스트 결제로만 처리됩니다.
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">세미프랜차이즈가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {items.map((sf) => (
            <section key={sf.key} className="rounded-lg border border-gray-200 bg-white p-4">
              {editKey === sf.key ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">이름</span>
                      <input className={INPUT} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">상태</span>
                      <select
                        className={INPUT}
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'closed' })}
                      >
                        <option value="active">운영</option>
                        <option value="closed">마감</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">커뮤니티 key</span>
                      <input
                        className={INPUT}
                        value={editForm.communityKey}
                        onChange={(e) => setEditForm({ ...editForm, communityKey: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">결제 수취 주체 키 (미정 — 사업 결정 후 입력)</span>
                      <input
                        className={INPUT}
                        placeholder="미정"
                        value={editForm.paymentReceiverKey}
                        onChange={(e) => setEditForm({ ...editForm, paymentReceiverKey: e.target.value })}
                      />
                    </label>
                  </div>
                  <textarea aria-label="서비스 가입 조건 수정" className={INPUT} maxLength={4000} value={editForm.registrationConditions} onChange={(e) => setEditForm({ ...editForm, registrationConditions: e.target.value })} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || !editForm.name.trim()}
                      onClick={() => saveEdit(sf)}
                      className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button type="button" onClick={() => setEditKey(null)} className="rounded-md border px-4 py-2 text-sm">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{sf.name}</h3>
                      <span className="text-xs text-gray-500">{sf.key}</span>
                      <StatusBadge status={sf.status} label={sf.status === 'active' ? '운영' : '마감'} />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      활성 가입 약국 {sf.activeMemberCount ?? 0}곳 · 커뮤니티 {sf.community_key || '-'} · 수취 주체{' '}
                      {sf.payment_receiver_key || '미정'}
                    </div>
                  </div>
                  <button type="button" onClick={() => startEdit(sf)} className="rounded-md border px-3 py-1.5 text-sm">
                    수정
                  </button>
                </div>
              )}

              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="mb-2 text-sm font-medium text-gray-700">담당 운영자</div>
                {(sf.operators ?? []).length === 0 ? (
                  <div className="text-xs text-gray-400">지정된 담당 운영자가 없습니다.</div>
                ) : (
                  <ul className="space-y-1">
                    {(sf.operators ?? []).map((op) => (
                      <li key={op.userId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-mono text-xs text-gray-700">
                          {op.userId} <span className="text-gray-400">· {formatDateTime(op.assignedAt)}</span>
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => revoke(sf, op.userId)}
                          className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          해제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex gap-2">
                  <input
                    className={INPUT}
                    placeholder="운영자 사용자 ID (UUID)"
                    value={operatorInput[sf.key] ?? ''}
                    onChange={(e) => setOperatorInput((prev) => ({ ...prev, [sf.key]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={busy || !(operatorInput[sf.key] ?? '').trim()}
                    onClick={() => assign(sf)}
                    className="whitespace-nowrap rounded-md bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    담당 지정
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
