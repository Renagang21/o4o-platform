/**
 * SignageMediaPanel — 내 동영상 (사이니지 미디어)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#69)
 *
 * KPA 의 [내 동영상] 탭과 같은 업무다. 원장은 공통 `signage_media` 이며,
 * 유튜브·비메오 주소만 등록할 수 있다(공통 service 계약 — 파일 업로드 축은 여기에 없다).
 * 등록한 동영상은 재생 목록 [항목 관리] 의 "매장 미디어" 에 그대로 나타난다.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  fetchSignageMedia,
  createSignageMedia,
  updateSignageMedia,
  deleteSignageMedia,
  type SignageMedia,
} from '../../../lib/api/pharmacyHubStoreSignage';
import { StoreConnectionNotice, type StoreConnectionState } from '../../../components/store-owner/StoreConnectionNotice';

export default function SignageMediaPanel() {
  const [items, setItems] = useState<SignageMedia[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; name: string; sourceUrl: string; description: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchSignageMedia()
      .then((r) => {
        setConnection(r.storeConnection);
        setItems(r.items);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '동영상을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form) return;
    const name = form.name.trim();
    const sourceUrl = form.sourceUrl.trim();
    if (!name || (!form.id && !sourceUrl)) {
      window.alert('이름과 동영상 주소를 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await updateSignageMedia(form.id, {
          name,
          sourceUrl: sourceUrl || undefined,
          description: form.description.trim(),
        });
      } else {
        await createSignageMedia({ name, sourceUrl, description: form.description.trim() || undefined });
      }
      setForm(null);
      load();
    } catch (e: any) {
      window.alert(e?.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: SignageMedia) => {
    if (!window.confirm(`"${m.name}" 동영상을 삭제할까요? 이미 재생 목록에 담긴 사본은 그대로 남습니다.`)) return;
    try {
      await deleteSignageMedia(m.id);
      load();
    } catch (e: any) {
      window.alert(e?.message || '삭제하지 못했습니다.');
    }
  };

  if (connection && connection.status !== 'connected') {
    return <StoreConnectionNotice connection={connection} subject="매장 사이니지" />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          유튜브·비메오 주소로 매장 동영상을 등록합니다. 등록한 동영상은 재생 목록에 담을 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => setForm({ id: null, name: '', sourceUrl: '', description: '' })}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          동영상 등록
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">등록한 동영상이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">"동영상 등록" 으로 유튜브·비메오 주소를 추가하세요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{m.sourceType}</span>
                  <span className="truncate">{m.sourceUrl}</span>
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ id: m.id, name: m.name, sourceUrl: m.sourceUrl, description: m.description ?? '' })
                  }
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5">
            <h2 className="text-base font-semibold">{form.id ? '동영상 수정' : '동영상 등록'}</h2>
            <label className="mt-4 block text-sm text-gray-700">
              이름
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="예: 매장 안내 영상"
              />
            </label>
            <label className="mt-3 block text-sm text-gray-700">
              동영상 주소 (유튜브 · 비메오)
              <input
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </label>
            <label className="mt-3 block text-sm text-gray-700">
              설명 (선택)
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
