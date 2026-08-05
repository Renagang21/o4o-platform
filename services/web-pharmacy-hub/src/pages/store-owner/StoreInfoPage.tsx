/**
 * Store Info — Pharmacy-Hub 매장 정보 조회·수정
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1  (범위 A)
 *
 * /store-owner/info — 공통 매장 셸(StoreDashboardLayout) 안에서 렌더된다.
 *
 * 데이터 원천 (SSOT):
 *   매장 정보      organizations
 *   서비스 연결    organization_service_enrollments (service_code='pharmacy-hub')
 *   공개 매장 주소 platform_store_slugs
 *   users.businessInfo 는 읽지도 쓰지도 않는다 (매장 정보 SSOT 가 아니다).
 *
 * 조직 결정은 전적으로 서버 몫이다 — 이 화면은 organizationId 를 보내지 않는다.
 *   not_connected : 안내 + 저장 UI 미노출 (다른 조직 정보를 대신 보여주지 않는다)
 *   ambiguous     : 안내 + 저장 UI 미노출 (임의 선택 없음)
 *
 * 수정 가능 항목은 서버 응답의 editableFields 를 따른다. 읽기 전용 항목
 * (사업자등록번호 · 조직 코드 · 공개 매장 주소)은 사유와 함께 표시만 한다.
 *
 * 조회 실패는 정상 빈 상태로 삼키지 않는다 — 실패는 오류로 명시한다.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Info, Loader2, Store } from 'lucide-react';
import {
  fetchStoreInfo,
  updateStoreInfo,
  type StoreInfo,
  type StoreInfoPatch,
} from '../../lib/api/pharmacyHubStoreInfo';
import { errorMessage, errorStatus } from '../../lib/api/pharmacyHubOrders';

interface FormState {
  name: string;
  phone: string;
  zipCode: string;
  baseAddress: string;
  detailAddress: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  zipCode: '',
  baseAddress: '',
  detailAddress: '',
  description: '',
};

function toForm(info: StoreInfo): FormState {
  const s = info.store;
  const d = s.addressDetail ?? {};
  return {
    name: s.name ?? '',
    phone: s.phone ?? '',
    zipCode: d.zipCode ?? '',
    // 구조화 주소가 없으면 평문 address 를 기본 주소 자리에 보여준다 (값 유실 방지).
    baseAddress: d.baseAddress ?? s.address ?? '',
    detailAddress: d.detailAddress ?? '',
    description: s.description ?? '',
  };
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 ' +
  'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ' +
  'disabled:bg-slate-50 disabled:text-slate-500';

function ViewRow({
  label,
  value,
  hint,
  badge,
}: {
  label: string;
  value: string | null;
  hint?: string;
  badge?: string;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{label}</p>
        {badge ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warn';
  title: string;
  children?: React.ReactNode;
}) {
  const cls =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  const Icon = tone === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {children ? <div className="mt-1 text-sm">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function StoreInfoPage() {
  const [info, setInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await fetchStoreInfo();
        if (!alive) return;
        setInfo(result);
        setForm(toForm(result));
      } catch (err) {
        if (!alive) return;
        const status = errorStatus(err);
        setError(
          status === 401
            ? '로그인이 필요합니다.'
            : errorMessage(err, '매장 정보를 불러오지 못했습니다.'),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const store = info?.store;
  const canEdit = useMemo(
    () => store?.status === 'connected' && (info?.editableFields.length ?? 0) > 0,
    [store?.status, info?.editableFields],
  );

  const startEdit = () => {
    if (!info) return;
    setForm(toForm(info));
    setSaveError(null);
    setSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (info) setForm(toForm(info));
    setSaveError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!info) return;
    const name = form.name.trim();
    if (name.length === 0) {
      setSaveError('매장명을 입력해 주세요.');
      return;
    }

    // 평문 address 는 구조화 주소로부터 합성해 두 표현이 어긋나지 않게 한다.
    const base = form.baseAddress.trim();
    const detail = form.detailAddress.trim();
    const composed = [base, detail].filter(Boolean).join(' ');
    const addressDetail =
      form.zipCode.trim() || base || detail
        ? {
            ...(form.zipCode.trim() ? { zipCode: form.zipCode.trim() } : {}),
            ...(base ? { baseAddress: base } : {}),
            ...(detail ? { detailAddress: detail } : {}),
          }
        : null;

    const patch: StoreInfoPatch = {
      name,
      phone: form.phone.trim() || null,
      address: composed || null,
      addressDetail,
      description: form.description.trim() || null,
    };

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateStoreInfo(patch);
      setInfo(updated);
      setForm(toForm(updated));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setSaveError(errorMessage(err, '매장 정보를 저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        매장 정보를 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">매장 정보</h1>
        <Notice tone="warn" title="매장 정보를 불러오지 못했습니다.">
          <p>{error}</p>
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-teal-600" />
        <h1 className="text-xl font-bold text-slate-900">매장 정보</h1>
      </div>

      {store?.status === 'not_connected' ? (
        <Notice tone="info" title="연결된 매장이 없습니다.">
          <p>
            Pharmacy-Hub 매장 연결이 아직 완료되지 않았습니다. 운영자에게 매장 연결을 요청해
            주세요. 연결 전에는 매장 정보를 조회·수정할 수 없습니다.
          </p>
          <p className="mt-2">
            <Link to="/join/status" className="font-medium text-teal-700 underline">
              내 가입 상태 보기
            </Link>
          </p>
        </Notice>
      ) : null}

      {store?.status === 'ambiguous' ? (
        <Notice tone="warn" title="연결된 매장이 여러 개로 확인됩니다.">
          <p>
            Pharmacy-Hub 매장으로 연결된 조직이 {store.candidateCount}개입니다. 어느 매장인지
            임의로 고르지 않습니다. 운영자에게 매장 연결 정리를 요청해 주세요.
          </p>
          <p className="mt-1 text-xs opacity-80">코드: {store.errorCode}</p>
        </Notice>
      ) : null}

      {store?.status === 'connected' ? (
        <>
          {saved ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              매장 정보를 저장했습니다.
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">기본 정보</h2>
              {!editing && canEdit ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  수정
                </button>
              ) : null}
            </div>

            {editing ? (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">매장명</label>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="매장명"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">대표 연락처</label>
                  <input
                    className={inputCls}
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="02-000-0000"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">우편번호</label>
                    <input
                      className={inputCls}
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      placeholder="00000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">기본 주소</label>
                    <input
                      className={inputCls}
                      value={form.baseAddress}
                      onChange={(e) => setForm({ ...form, baseAddress: e.target.value })}
                      placeholder="시/구/도로명"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">상세 주소</label>
                  <input
                    className={inputCls}
                    value={form.detailAddress}
                    onChange={(e) => setForm({ ...form, detailAddress: e.target.value })}
                    placeholder="건물명 · 층 · 호수"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">매장 소개</label>
                  <textarea
                    className={`${inputCls} min-h-[96px]`}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="매장 소개 (선택)"
                  />
                </div>

                {saveError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {saveError}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <ViewRow label="매장명" value={store.name} />
                <ViewRow label="대표 연락처" value={store.phone} />
                <ViewRow
                  label="주소"
                  value={
                    store.addressDetail?.zipCode
                      ? `(${store.addressDetail.zipCode}) ${store.address ?? ''}`.trim()
                      : store.address
                  }
                />
                <ViewRow label="매장 소개" value={store.description} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">사업자 · 서비스 연결</h2>
            <ViewRow
              label="사업자등록번호"
              value={store.businessNumber}
              badge="변경 불가"
              hint="사업자등록번호는 가입 심사 근거입니다. 변경이 필요하면 운영자에게 문의해 주세요."
            />
            <ViewRow label="조직 코드" value={store.code} badge="변경 불가" />
            <ViewRow
              label="서비스 연결"
              value={
                info?.enrollment
                  ? `${info.enrollment.serviceCode} · ${info.enrollment.status}`
                  : null
              }
              hint={
                info?.enrollment?.enrolledAt
                  ? `연결일 ${new Date(info.enrollment.enrolledAt).toLocaleDateString('ko-KR')}`
                  : undefined
              }
            />
            <ViewRow
              label="공개 매장 주소"
              value={info?.publicStore?.slug ?? null}
              badge="변경 불가"
              hint={
                info?.publicStore?.slug
                  ? '공개 매장 주소는 전역에서 유일해야 하므로 운영자를 통해 변경합니다.'
                  : '아직 공개 매장 주소가 발급되지 않았습니다.'
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
