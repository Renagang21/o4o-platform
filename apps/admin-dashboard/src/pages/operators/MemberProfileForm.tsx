import { useEffect, useRef, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { MemberRegistrationFields } from '@o4o/account-ui';
import {
  type MemberRegistrationFields as RegistrationValues,
  type MemberRegistrationType,
} from '@o4o/types';
import { memberError, type MemberDetail } from './member-workspace-model';
import TemporaryPasswordIssue from './TemporaryPasswordIssue';
const inputClass =
  'block w-full rounded border border-slate-300 bg-white px-3 py-2 read-only:bg-slate-50 disabled:opacity-50';
export default function MemberProfileForm({
  detail,
  editing,
  busy,
  perform,
  onCancel,
  onBusyChange,
  onAccessLost,
}: {
  onAccessLost: () => void;
  detail: MemberDetail;
  editing: boolean;
  busy: boolean;
  perform: (work: () => Promise<unknown>) => Promise<void>;
  onCancel: () => void;
  onBusyChange: (value: boolean) => void;
}) {
  const { member, registration } = detail;
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [fields, setFields] = useState({
    name: member.name ?? '',
    nickname: member.nickname ?? '',
    email: member.email,
    phone: member.phone ?? '',
  });
  const [type, setType] = useState<MemberRegistrationType | ''>(
    registration?.type ?? '',
  );
  const [values, setValues] = useState<RegistrationValues>(
    registration?.fields ?? {},
  );
  const [reason, setReason] = useState(''),
    [documentError, setDocumentError] = useState('');
  const base = `/member-registration/members/${encodeURIComponent(member.userId)}/document`;
  const documentWork = async (work: () => Promise<void>) => {
    onBusyChange(true);
    setDocumentError('');
    try {
      await work();
    } catch (error) {
      if (active.current) {
        if (
          [401, 403].includes(
            (error as { response?: { status?: number } }).response?.status ?? 0,
          )
        )
          onAccessLost();
        else setDocumentError(memberError(error));
      }
    } finally {
      if (active.current) onBusyChange(false);
    }
  };
  return (
    <div className="space-y-3">
      <form
        aria-label={editing ? '회원 정보 수정' : '회원 정보 보기'}
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!editing || busy || !reason.trim() || !type) return;
          void perform(() =>
            authClient.api.patch(
              `/qualifications/pharmacist/members/${encodeURIComponent(member.userId)}`,
              {
                ...Object.fromEntries(
                  Object.entries(fields).map(([key, value]) => [
                    key,
                    value.trim(),
                  ]),
                ),
                reason: reason.trim(),
                version: member.version,
                evidenceConfirmed: true,
                qualificationVersion:
                  registration?.qualificationVersion ??
                  detail.qualification?.version ??
                  null,
                businessVersion: registration?.businessVersion ?? null,
                ...(registration?.businessEditable === false
                  ? {}
                  : { registration: { type, fields: values } }),
              },
            ),
          );
        }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(Object.keys(fields) as Array<keyof typeof fields>).map((key) => (
            <label key={key} className="block text-sm">
              {
                {
                  name: '이름',
                  nickname: '닉네임',
                  email: '이메일',
                  phone: '휴대전화',
                }[key]
              }
              <input
                className={inputClass}
                type={
                  key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
                }
                required={['nickname', 'email'].includes(key)}
                maxLength={key === 'email' ? 255 : key === 'phone' ? 20 : 100}
                readOnly={!editing}
                disabled={busy}
                value={fields[key]}
                onChange={(event) =>
                  setFields({ ...fields, [key]: event.target.value })
                }
              />
            </label>
          ))}
        </div>
        <MemberRegistrationFields
          type={type}
          fields={values}
          disabled={busy}
          readOnly={!editing || registration?.businessEditable === false}
          typeLocked={registration?.state === 'approved'}
          onTypeChange={(next) => {
            setType(next);
            setValues({});
          }}
          onChange={setValues}
          onUpload={(file) => {
            void documentWork(async () => {
              const body = new FormData();
              body.append('file', file);
              const response = await authClient.api.post(base, body, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              if (active.current)
                setValues((previous) => ({
                  ...previous,
                  businessRegistrationDocumentId: response.data.data.id,
                }));
            });
          }}
          onOpenDocument={
            detail.permissions.readDocuments !== false && values.businessRegistrationDocumentId
              ? () => {
                  void documentWork(async () => {
                    const response = await authClient.api.get(
                      `${base}/${encodeURIComponent(values.businessRegistrationDocumentId!)}`,
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
        {values.businessRegistrationDocumentId && detail.permissions.readDocuments === false && <p>사업자 서류 조회 권한이 없어 첨부 여부만 표시합니다.</p>}
        {documentError && <output role="alert">{documentError}</output>}
        {editing && (
          <>
            <label className="block text-sm">
              수정 사유
              <textarea
                required
                maxLength={2000}
                disabled={busy}
                className={inputClass}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
                disabled={busy || !reason.trim() || !type}
              >
                회원 정보 저장
              </button>
              <button type="button" disabled={busy} onClick={onCancel}>
                취소
              </button>
            </div>
          </>
        )}
      </form>
      {editing && member.hasPassword !== false && (
        <TemporaryPasswordIssue
          onAccessLost={onAccessLost}
          detail={detail}
          busy={busy}
          onBusyChange={onBusyChange}
          onFinished={() => {
            void perform(async () => undefined);
          }}
        />
      )}
    </div>
  );
}
