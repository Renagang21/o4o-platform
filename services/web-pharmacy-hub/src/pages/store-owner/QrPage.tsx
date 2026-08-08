/**
 * QrPage (약국 경영자) — 매장 QR 관리
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 A)
 *
 * 원장은 공통 `store_qr_codes` 다 — 신규 테이블 0 / 새 QR 엔진 0.
 * 조직은 서버가 Pharmacy-Hub enrollment 로 결정한다(프론트가 organizationId 를 보내지 않는다).
 *
 * 연결 대상은 **매장이 이미 가진 것**만 고른다:
 *   자료함(자료) · 매장 콘텐츠 · 매장 경영활용 제품 · 외부 링크.
 * 공급 상품(B2B 구매 대상)을 실행 자산으로 쓰지 않는다.
 *
 * 주소(slug)와 연결 대상은 만든 뒤 바꾸지 않는다 — 이미 인쇄해서 매장 밖에 나가 있는
 * QR 이 조용히 다른 곳을 가리키게 되기 때문이다. 목적지를 바꾸려면 새 QR 을 만든다.
 * 삭제는 **비활성화(soft delete)** 이며 공개 랜딩은 즉시 닫힌다.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  fetchStoreQrCodes,
  fetchQrSources,
  createStoreQrCode,
  updateStoreQrCode,
  deactivateStoreQrCode,
  fetchQrAnalytics,
  downloadQrExport,
  type StoreQrCode,
  type QrSources,
  type QrAnalytics,
  type QrLandingType,
  type CreateQrInput,
} from '../../lib/api/pharmacyHubStoreQr';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const LANDING_LABELS: Record<string, string> = {
  page: '콘텐츠',
  product: '제품',
  link: '외부 링크',
  video: '동영상',
  screen_set: '태블릿 화면',
  promotion: '프로모션',
};

export default function StoreOwnerQrPage() {
  const [items, setItems] = useState<StoreQrCode[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [publicOrigin, setPublicOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StoreQrCode | null>(null);
  const [analyticsFor, setAnalyticsFor] = useState<{ qr: StoreQrCode; data: QrAnalytics } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchStoreQrCodes({ page: 1, limit: 100 })
      .then((p) => {
        setConnection(p.storeConnection);
        setItems(p.items);
        setPublicOrigin(p.publicOrigin);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || 'QR 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeactivate = async (qr: StoreQrCode) => {
    if (
      !window.confirm(
        `"${qr.title}" QR 을 내릴까요?\n스캔하면 더 이상 열리지 않습니다. 이미 인쇄한 QR 이 있다면 함께 회수해 주세요.`,
      )
    ) {
      return;
    }
    try {
      await deactivateStoreQrCode(qr.id);
      load();
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    }
  };

  const handleAnalytics = async (qr: StoreQrCode) => {
    try {
      const data = await fetchQrAnalytics(qr.id);
      setAnalyticsFor({ qr, data });
    } catch (e: any) {
      window.alert(e?.message || '스캔 통계를 불러오지 못했습니다.');
    }
  };

  const handleDownload = async (qr: StoreQrCode, format: 'png' | 'svg' | 'pdf') => {
    try {
      await downloadQrExport(qr, format, format === 'pdf' ? 'a4' : 'large');
    } catch (e: any) {
      window.alert(e?.message || '파일을 만들지 못했습니다.');
    }
  };

  if (creating) {
    return (
      <QrCreateForm
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">QR</h1>
          <p className="mt-1 text-sm text-gray-500">
            매장 자료·제품·외부 링크로 연결되는 QR 을 만들고 출력합니다. 스캔 횟수도 함께 확인할 수 있습니다.
          </p>
        </div>
        {connection?.status === 'connected' && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            QR 만들기
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="매장 QR" />
      ) : loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">만든 QR 이 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">
            "QR 만들기" 로 자료함 자료·매장 콘텐츠·경영활용 제품에 연결되는 QR 을 만드세요.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((qr) => (
            <li key={qr.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{qr.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                      {LANDING_LABELS[qr.landingType] ?? qr.landingType}
                    </span>
                    <span>스캔 {qr.scanCount}회</span>
                    <a
                      href={`${publicOrigin}/qr/${qr.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      /qr/{qr.slug}
                    </a>
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(qr, 'png')}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(qr, 'svg')}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    SVG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(qr, 'pdf')}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    인쇄용 PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalytics(qr)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    스캔 통계
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(qr)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    이름 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(qr)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    내리기
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <QrRenameDialog
          qr={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {analyticsFor && (
        <AnalyticsDialog
          title={analyticsFor.qr.title}
          data={analyticsFor.data}
          onClose={() => setAnalyticsFor(null)}
        />
      )}
    </div>
  );
}

// ─── QR 만들기 ───────────────────────────────────────────────────────────────

function QrCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [sources, setSources] = useState<QrSources | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [landingType, setLandingType] = useState<QrLandingType>('page');
  /** page 유형에서 자료함 자료인지(library) 매장 콘텐츠인지(content) 구분 */
  const [pageSource, setPageSource] = useState<'library' | 'content'>('library');
  const [targetId, setTargetId] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQrSources()
      .then(setSources)
      .catch((e: any) => setError(e?.message || '연결 대상을 불러오지 못했습니다.'));
  }, []);

  // 유형을 바꾸면 이전 선택은 의미가 없다 — 다른 목록의 id 가 남아 넘어가지 않도록 비운다.
  useEffect(() => {
    setTargetId('');
  }, [landingType, pageSource]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('QR 이름을 입력해 주세요.');
      return;
    }

    const input: CreateQrInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      landingType,
    };

    if (landingType === 'link') {
      if (!/^https?:\/\//i.test(linkUrl.trim())) {
        setError('연결할 주소를 https:// 로 시작하게 입력해 주세요.');
        return;
      }
      input.landingTargetId = linkUrl.trim();
    } else {
      if (!targetId) {
        setError('연결할 대상을 선택해 주세요.');
        return;
      }
      if (landingType === 'page' && pageSource === 'library') input.libraryItemId = targetId;
      else input.landingTargetId = targetId;
    }

    setSaving(true);
    setError(null);
    try {
      await createStoreQrCode(input);
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'QR 을 만들지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const pageOptions =
    pageSource === 'library'
      ? (sources?.libraryAssets ?? []).map((a) => ({ id: a.id, label: a.title }))
      : (sources?.storeContents ?? []).map((c) => ({ id: c.id, label: c.title }));
  const productOptions = (sources?.products ?? []).map((p) => ({
    id: p.id,
    label: p.brandName ? `${p.name} (${p.brandName})` : p.name,
  }));
  const options = landingType === 'product' ? productOptions : pageOptions;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">QR 만들기</h1>
        <div className="flex items-center gap-2">
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
            {saving ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-title">
            QR 이름
          </label>
          <input
            id="ph-qr-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="예: 감기약 코너 안내"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-desc">
            설명 (선택)
          </label>
          <input
            id="ph-qr-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-landing">
            연결 유형
          </label>
          <select
            id="ph-qr-landing"
            value={landingType}
            onChange={(e) => setLandingType(e.target.value as QrLandingType)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="page">매장 콘텐츠 · 자료</option>
            <option value="product">매장 경영활용 제품</option>
            <option value="link">외부 링크</option>
          </select>
        </div>

        {landingType === 'page' && (
          <div>
            <span className="mb-1 block text-xs font-semibold text-gray-500">자료 출처</span>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={pageSource === 'library'}
                  onChange={() => setPageSource('library')}
                />
                자료함
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={pageSource === 'content'}
                  onChange={() => setPageSource('content')}
                />
                매장 콘텐츠
              </label>
            </div>
          </div>
        )}

        {landingType === 'link' ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-url">
              연결할 주소
            </label>
            <input
              id="ph-qr-url"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-target">
              연결할 대상
            </label>
            {!sources ? (
              <p className="text-sm text-gray-400">불러오는 중…</p>
            ) : options.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
                {landingType === 'product'
                  ? '매장 경영활용 제품이 없습니다. "매장 제품" 에서 먼저 제품을 등록해 주세요.'
                  : '연결할 자료가 없습니다. "콘텐츠·자료함" 에서 먼저 자료를 등록해 주세요.'}
              </p>
            ) : (
              <select
                id="ph-qr-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">선택해 주세요</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
          QR 주소와 연결 대상은 만든 뒤에는 바꿀 수 없습니다. 이미 인쇄해 매장에 붙인 QR 이 다른 곳을
          가리키지 않도록 하기 위한 것입니다. 목적지를 바꾸려면 새 QR 을 만드세요.
        </p>
      </div>
    </div>
  );
}

// ─── 이름 수정 ───────────────────────────────────────────────────────────────

function QrRenameDialog({
  qr,
  onClose,
  onSaved,
}: {
  qr: StoreQrCode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(qr.title);
  const [description, setDescription] = useState(qr.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('QR 이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateStoreQrCode(qr.id, { title: title.trim(), description: description.trim() });
      onSaved();
    } catch (e: any) {
      setError(e?.message || '수정하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <Dialog title="QR 이름 수정" onClose={onClose}>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-rename">
            QR 이름
          </label>
          <input
            id="ph-qr-rename"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-qr-redesc">
            설명 (선택)
          </label>
          <input
            id="ph-qr-redesc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-400">주소(/qr/{qr.slug})와 연결 대상은 바뀌지 않습니다.</p>
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
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </Dialog>
  );
}

// ─── 스캔 통계 ───────────────────────────────────────────────────────────────

function AnalyticsDialog({
  title,
  data,
  onClose,
}: {
  title: string;
  data: QrAnalytics;
  onClose: () => void;
}) {
  return (
    <Dialog title={`스캔 통계 — ${title}`} onClose={onClose}>
      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ['전체', data.totalScans],
          ['오늘', data.todayScans],
          ['최근 7일', data.weeklyScans],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-md border border-gray-200 px-3 py-3">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{value as number}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-gray-500">
        기기별: 휴대폰 {data.deviceStats.mobile ?? 0} · 태블릿 {data.deviceStats.tablet ?? 0} · PC{' '}
        {data.deviceStats.desktop ?? 0}
      </p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
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
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
