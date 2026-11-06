import { useEffect, useRef, useState } from 'react';
import { MemberRegistrationFields } from '@o4o/account-ui';
import {
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
const errorMessage = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } }).response?.data?.error ??
  '처리하지 못했습니다. 다시 확인해 주시기 바랍니다.';
export default function MemberRegistrationForm() {
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
      {state === 'pending' && <p role="status">가입 검토 대기 중입니다.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {(['name', 'nickname', 'phone'] as const).map((key) => (
          <label key={key} className="block text-sm">
            {{ name: '이름', nickname: '닉네임', phone: '휴대전화' }[key]}
            <input
              required
              readOnly={readOnly}
              disabled={busy}
              maxLength={key === 'phone' ? 20 : 100}
              type={key === 'phone' ? 'tel' : 'text'}
              className="mt-1 block w-full rounded border p-2"
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
          className="w-full rounded bg-emerald-800 px-4 py-3 text-white disabled:opacity-50"
        >
          가입 정보 제출
        </button>
      )}
    </form>
  );
}
