import { useEffect, useRef, useState } from 'react';
import { MemberRegistrationFields } from '@o4o/account-ui';
import { AddressSearch } from '@o4o/ui';
import {
  MEMBER_REGISTRATION_TYPES,
  type MemberRegistration,
  type MemberRegistrationType,
  type MemberRegistrationFields as Values,
} from '@o4o/types';
import {
  ServiceEnrollmentPolicyAgreement,
  useServiceEnrollmentPolicies,
} from '@o4o/shared-space-ui';
import { authClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
/** 1단계 유형 카드의 짧은 안내. 실제 필요한 정보는 2단계에서 유형별로 받는다. */
const TYPE_HINTS: Record<MemberRegistrationType, string> = {
  pharmacist: '약사 면허 정보를 확인한 뒤 이용합니다.',
  pharmacy_owner: '약국 · 사업자 정보로 내 매장을 이용합니다.',
  supplier: '사업자 정보로 상품을 공급합니다.',
  partner: '제휴 · 협력 활동을 합니다.',
  other: '그 밖의 회원으로 이용합니다.',
};
const errorMessage = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } }).response?.data?.error ??
  '처리하지 못했습니다. 다시 확인해 주시기 바랍니다.';
/**
 * onSubmitted: 제출이 끝난 뒤 화면을 떠나는 동작(가입 신청 페이지 → 메인 · 2026-11-12 사용자 지적).
 * 주지 않으면 종전처럼 이 화면에서 안내 문구를 보이고 제출 상태를 다시 읽는다.
 */
export default function MemberRegistrationForm({ onSubmitted }: { onSubmitted?: () => void } = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [type, setType] = useState<MemberRegistrationType | ''>(''),
    [fields, setFields] = useState<Values>({}),
    [state, setState] = useState<MemberRegistration['state'] | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [member, setMember] = useState({
      name: '',
      nickname: '',
      phone: '',
      version: '',
    }),
    [attempt, setAttempt] = useState(0);
  // 2단계 가입(2026-11-10 사용자 확정): ① 가입 유형 카드 선택 → 「다음」 → ② 그 유형에 필요한 정보만 입력.
  const [step, setStep] = useState<'type' | 'details'>('type');
  const active = useRef(true),
    requestLock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const scope =
    type === 'pharmacy_owner'
      ? 'kpa-society'
      : type === 'supplier'
        ? 'supplier'
        : type === 'partner'
          ? 'partner-support'
          : 'neture';
  const agreement = useServiceEnrollmentPolicies(
    scope,
    async () =>
      type
        ? (await authClient.api.get(`/member-registration/policies/${type}`))
            .data.data
        : [],
    `${user?.id ?? ''}:${type}`,
  );
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    void authClient.api
      .get('/member-registration/self')
      .then((response) => {
        if (!current) return;
        const data = response.data.data;
        setMember({
          name: data.member.name ?? '',
          nickname: data.member.nickname ?? '',
          phone: data.member.phone ?? '',
          version: data.member.version,
        });
        setType(data.registration?.type ?? '');
        setStep(data.registration?.type ? 'details' : 'type');
        setFields(data.registration?.fields ?? {});
        setState(data.registration?.state ?? null);
        setCanSubmit(data.canSubmit === true);
        if (data.registration?.reason) setNotice(data.registration.reason);
      })
      .catch((e) => {
        if (current) setError(errorMessage(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [user?.id, attempt]);
  const readOnly = state === 'approved' || (state === 'pending' && !canSubmit);
  const documentWork = async (work: () => Promise<void>) => {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    } finally {
      requestLock.current = false;
      if (active.current) setBusy(false);
    }
  };
  if (loading) return <p role="status">가입 정보를 불러오는 중입니다.</p>;
  if (!member.version)
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setAttempt((v) => v + 1)}>
          다시 조회
        </button>
      </div>
    );
  if (step === 'type' && !readOnly)
    return (
      <section aria-labelledby="registration-type-title" className="space-y-4">
        <div>
          <h2 id="registration-type-title" className="text-lg font-semibold">가입 유형 선택</h2>
          <p className="mt-1 text-sm text-slate-600">활동하실 유형을 골라 주시기 바랍니다. 필요한 정보는 다음 단계에서 유형별로 받습니다.</p>
        </div>
        {notice && <p role="status" className="text-sm">{notice}</p>}
        <div role="radiogroup" aria-label="가입 유형" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(MEMBER_REGISTRATION_TYPES) as Array<[MemberRegistrationType, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              onClick={() => { if (type !== key) { setType(key); setFields({}); } }}
              className={`rounded-lg border p-4 text-left transition ${type === key ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700' : 'border-slate-300 bg-white hover:border-emerald-500'}`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="mt-1 block text-sm text-slate-600">{TYPE_HINTS[key]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!type}
          onClick={() => setStep('details')}
          className="w-full rounded bg-emerald-800 px-4 py-3 text-white disabled:opacity-50 md:ml-auto md:block md:w-auto md:min-w-[200px]"
        >
          다음
        </button>
      </section>
    );
  return (
    <form
      aria-label="가입 정보"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !type ||
          busy ||
          requestLock.current ||
          !agreement.ready ||
          readOnly
        )
          return;
        requestLock.current = true;
        setBusy(true);
        setError('');
        setNotice('');
        void authClient.api
          .post('/member-registration/self', {
            ...member,
            type,
            fields,
            policyReferences: agreement.references,
          })
          .then(() => {
            if (active.current) {
              if (onSubmitted) {
                onSubmitted();
                return;
              }
              setNotice(
                '가입 정보를 제출했습니다. 운영자가 확인 후 승인합니다.',
              );
              setAttempt((v) => v + 1);
            }
          })
          .catch((e) => {
            if (active.current) setError(errorMessage(e));
          })
          .finally(() => {
            requestLock.current = false;
            if (active.current) setBusy(false);
          });
      }}
    >
      {state === 'approved' && (
        <p role="status">
          승인된 가입 정보입니다. 사업자 변경은 My Home의 해당 절차를 이용해
          주시기 바랍니다.
        </p>
      )}
      {/* 제출한 신청은 검토가 끝날 때까지 고칠 수 없다 — 입력 칸처럼 보여 「입력이 안 된다」로 오해되던 것(2026-11-12). */}
      {state === 'pending' && readOnly && (
        <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          가입 신청을 검토하고 있습니다. 검토 중에는 내용을 고칠 수 없습니다. 승인되면 이용하실 수 있습니다.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{type ? `${MEMBER_REGISTRATION_TYPES[type]} 정보 입력` : '가입 정보 입력'}</h2>
        {!readOnly && <button type="button" disabled={busy} className="text-sm text-emerald-800 underline" onClick={() => setStep('type')}>유형 다시 선택</button>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {/* 닉네임은 모든 유형 필수, 이름 · 휴대전화는 선택(2026-11-09 S4 · S5). */}
        {(['nickname', 'name', 'phone'] as const).map((key) => (
          <label key={key} className="block text-sm">
            {{ name: '이름 (선택)', nickname: '닉네임', phone: '휴대전화 (선택)' }[key]}
            <input
              required={key === 'nickname'}
              readOnly={readOnly}
              disabled={busy}
              maxLength={key === 'phone' ? 20 : 100}
              type={key === 'phone' ? 'tel' : 'text'}
              {...(key === 'phone' ? { inputMode: 'numeric' as const, autoComplete: 'tel', ...(readOnly ? {} : { placeholder: '01012345678' }) } : {})}
              className="mt-1 block w-full rounded border p-2 read-only:cursor-default read-only:bg-slate-100 read-only:text-slate-600"
              value={member[key]}
              onChange={(event) =>
                setMember((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>
      <MemberRegistrationFields
        type={type}
        hideType
        AddressSearch={AddressSearch}
        fields={fields}
        disabled={busy}
        readOnly={readOnly}
        onTypeChange={(next) => {
          setType(next);
          setFields({});
        }}
        onChange={setFields}
        onUpload={(file) => {
          void documentWork(async () => {
            const body = new FormData();
            body.append('file', file);
            const response = await authClient.api.post(
              '/member-registration/self/document',
              body,
              { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            if (active.current)
              setFields((previous) => ({
                ...previous,
                businessRegistrationDocumentId: response.data.data.id,
              }));
          });
        }}
        onOpenDocument={
          fields.businessRegistrationDocumentId
            ? () => {
                void documentWork(async () => {
                  const response = await authClient.api.get(
                    `/member-registration/self/document/${encodeURIComponent(fields.businessRegistrationDocumentId!)}`,
                    { responseType: 'blob' },
                  );
                  const url = URL.createObjectURL(response.data);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = '사업자등록증';
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                });
              }
            : undefined
        }
      />
      {!readOnly && <ServiceEnrollmentPolicyAgreement agreement={agreement} />}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {!readOnly && (
        <button
          type="submit"
          disabled={busy || !type || !agreement.ready}
          className="w-full rounded bg-emerald-800 px-4 py-3 text-white disabled:opacity-50 md:ml-auto md:block md:w-auto md:min-w-[200px]"
        >
          가입 신청
        </button>
      )}
    </form>
  );
}
