import React, { useCallback, useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import type { MediaAssetAdmin } from '@/api/media-library.api';

const enums: Record<string, string[]> = {
  originType: ['original', 'edited', 'ai_generated', 'external'],
  derivationType: [
    'original',
    'background-removed',
    'generated-angle',
    'generated-scene',
    'video-reference',
    'video-clip',
    'edited-video',
    'final-video',
    'thumbnail',
  ],
  qaStatus: ['PENDING', 'APPROVED', 'REJECTED'],
  productAccuracyLevel: ['EXACT', 'ACCEPTABLE', 'SUPPORT_ONLY', 'REJECTED'],
};
const labels: Record<string, string> = {
  originType: '원본 구분',
  derivationType: '파생 유형',
  qaStatus: '검수 상태',
  productAccuracyLevel: '제품 정확성',
  generationProvider: 'AI 제공자',
  generationModel: 'AI 모델',
  promptRef: '프롬프트 참조',
  generationJobId: '생성 작업 ID',
  rightsType: '권리 유형',
  sourceUrl: '출처 URL',
  commercialUseAllowed: '상업 이용 허용',
  attributionRequired: '출처 표기 필요',
};
const textFields = [
  'generationProvider',
  'generationModel',
  'promptRef',
  'generationJobId',
  'rightsType',
  'sourceUrl',
];
const base = '/platform/media-library';
const field = 'w-full border rounded px-2 py-1.5 text-sm';
interface Link {
  id: string;
  entityType: string;
  entityId: string;
  purpose: string;
}
interface Relations {
  links: Link[];
  parentAssetId: string | null;
  rootAssetId: string;
  children: MediaAssetAdmin[];
}
async function requestData<T>(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await authClient.api[method]<{
    success: boolean;
    data: T;
    code?: string;
    error?: string;
  }>(path, body);
  if (!res.data?.success)
    throw new Error(
      res.data?.error || res.data?.code || '요청에 실패했습니다.',
    );
  return res.data.data;
}
function message(error: unknown): string {
  const e = error as {
    response?: { data?: { error?: string; code?: string } };
    message?: string;
  };
  return (
    e.response?.data?.error ||
    e.response?.data?.code ||
    e.message ||
    '요청에 실패했습니다.'
  );
}
export function ExternalMediaForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState('youtube');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mb-4">
      <button
        className="border rounded px-3 py-2 text-sm"
        onClick={() => setOpen(!open)}
      >
        외부 영상 등록
      </button>
      {open && (
        <form
          className="mt-2 bg-white border rounded p-4 space-y-3 max-w-xl"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await requestData('post', `${base}/external`, {
                provider,
                title,
                externalUrl: url,
                consent,
              });
              toast.success('외부 영상이 등록되었습니다.');
              setOpen(false);
              setTitle('');
              setUrl('');
              setConsent(false);
              onCreated();
            } catch (error) {
              toast.error(message(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            제공자
            <select
              className={field}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="youtube">YouTube</option>
              <option value="o4o">O4O 자료실</option>
            </select>
          </label>
          <label className="block text-sm">
            제목
            <input
              required
              maxLength={300}
              className={field}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            영상 URL
            <input
              required
              type="url"
              className={field}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <p className="text-xs text-gray-500">
            YouTube 공개 영상 또는 O4O 자료실의 영구 주소를 등록합니다. 파일
            업로드나 영상 공개 범위 변경은 수행하지 않습니다.
          </p>
          <label className="flex gap-2 text-sm">
            <input
              required
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            URL과 메타데이터의 공용 라이브러리 등록에 동의합니다.
          </label>
          <button
            disabled={busy}
            className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
          >
            {busy ? '등록 중…' : '등록'}
          </button>
        </form>
      )}
    </div>
  );
}
export function MediaCatalogPanel({
  asset,
  onUpdated,
}: {
  asset: MediaAssetAdmin;
  onUpdated: (asset: MediaAssetAdmin) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      [
        ...Object.keys(enums),
        ...textFields,
        'commercialUseAllowed',
        'attributionRequired',
      ].map((k) => [k, asset[k as keyof MediaAssetAdmin] ?? null]),
    ),
  );
  const [parent, setParent] = useState(asset.parentAssetId || '');
  const [relations, setRelations] = useState<Relations | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState({
    entityType: 'product',
    entityId: '',
    purpose: '',
  });
  const [editLink, setEditLink] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setRelations(
        await requestData<Relations>('get', `${base}/${asset.id}/relations`),
      );
      setError('');
    } catch (e) {
      setError(message(e));
    }
  }, [asset.id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="border rounded p-3 mb-3">
      <summary className="cursor-pointer text-sm font-medium">
        제작 정보 · 연결 · 검수 · 권리
      </summary>
      <div className="text-xs text-gray-500 my-3 break-all">
        저장: {asset.storageType} / {asset.provider}
        <br />
        외부 URL: {asset.externalUrl || '—'}
        <br />
        원본 Root: {relations?.rootAssetId || asset.rootAssetId || asset.id}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key} className="block text-xs">
            {label}
            {enums[key] ? (
              <select
                className={field}
                value={String(values[key] ?? '')}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value || null }))
                }
              >
                <option value="">미확인 / 미지정</option>
                {enums[key].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            ) : ['commercialUseAllowed', 'attributionRequired'].includes(
                key,
              ) ? (
              <select
                className={field}
                value={values[key] === null ? '' : String(values[key])}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [key]:
                      e.target.value === '' ? null : e.target.value === 'true',
                  }))
                }
              >
                <option value="">미확인</option>
                <option value="true">예</option>
                <option value="false">아니요</option>
              </select>
            ) : (
              <input
                className={field}
                value={String(values[key] ?? '')}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value || null }))
                }
              />
            )}
          </label>
        ))}
        <label className="text-xs">
          부모 자산 ID
          <input
            className={field}
            value={parent}
            disabled={!!asset.parentAssetId}
            onChange={(e) => setParent(e.target.value)}
          />
        </label>
      </div>
      <button
        disabled={busy}
        className="my-3 border rounded px-3 py-2 text-sm disabled:opacity-50"
        onClick={() =>
          act(async () => {
            const updated = await requestData<MediaAssetAdmin>(
              'patch',
              `${base}/${asset.id}/catalog`,
              { ...values, ...(parent ? { parentAssetId: parent } : {}) },
            );
            onUpdated(updated);
            toast.success('제작 정보가 저장되었습니다.');
            await reload();
          })
        }
      >
        제작 정보 저장
      </button>
      <div className="border-t pt-3 text-sm">
        <h4 className="font-medium">연결 Entity / 파생 자산</h4>
        {error ? (
          <div role="alert" className="text-red-600">
            조회 실패: {error}
            <button onClick={() => void reload()} className="ml-2 underline">
              재시도
            </button>
          </div>
        ) : relations ? (
          <>
            {relations.links.length === 0 && (
              <p className="text-gray-500">명시적 연결 없음</p>
            )}
            {relations.links.map((l) => (
              <div key={l.id} className="py-2 break-all">
                {l.entityType} · {l.entityId} · {l.purpose}
                <button
                  disabled={busy}
                  className="ml-2 text-blue-600"
                  onClick={() => {
                    setEditLink(l.id);
                    setLink({
                      entityType: l.entityType,
                      entityId: l.entityId,
                      purpose: l.purpose,
                    });
                  }}
                >
                  편집
                </button>
                <button
                  disabled={busy}
                  className="ml-2 text-red-600"
                  onClick={() =>
                    act(async () => {
                      await requestData(
                        'delete',
                        `${base}/${asset.id}/links/${l.id}`,
                      );
                      toast.success('연결이 해제되었습니다.');
                      await reload();
                    })
                  }
                >
                  연결 해제
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              직접 파생 자산 {relations.children.length}건 (최대 100건 표시)
            </p>
            {relations.children.map((c) => (
              <p key={c.id} className="break-all text-xs">
                {c.title || c.originalName} · {c.id}
              </p>
            ))}
          </>
        ) : (
          <p>조회 중…</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          <label className="text-xs">
            연결 유형
            <select
              className={field}
              value={link.entityType}
              onChange={(e) =>
                setLink((v) => ({ ...v, entityType: e.target.value }))
              }
            >
              {[
                'product',
                'brand',
                'content',
                'service',
                'video-production-job',
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Entity ID
            <input
              className={field}
              value={link.entityId}
              maxLength={200}
              onChange={(e) =>
                setLink((v) => ({ ...v, entityId: e.target.value }))
              }
            />
          </label>
          <label className="text-xs">
            용도
            <input
              className={field}
              value={link.purpose}
              maxLength={100}
              onChange={(e) =>
                setLink((v) => ({ ...v, purpose: e.target.value }))
              }
            />
          </label>
        </div>
        <button
          disabled={busy || !link.entityId.trim() || !link.purpose.trim()}
          className="border rounded px-3 py-2 mt-2 disabled:opacity-50"
          onClick={() =>
            act(async () => {
              await requestData(
                editLink ? 'patch' : 'post',
                `${base}/${asset.id}/links${editLink ? '/' + editLink : ''}`,
                link,
              );
              setEditLink(null);
              setLink({ entityType: 'product', entityId: '', purpose: '' });
              toast.success('연결이 저장되었습니다.');
              await reload();
            })
          }
        >
          {editLink ? '연결 수정' : '연결 추가'}
        </button>
        {editLink && (
          <button className="ml-2" onClick={() => setEditLink(null)}>
            편집 취소
          </button>
        )}
      </div>
    </details>
  );
}
