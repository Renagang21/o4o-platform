import {
  MEMBER_REGISTRATION_FIELDS,
  MEMBER_REGISTRATION_TYPES,
  registrationFieldKeys,
  type MemberRegistrationFields as Values,
  type MemberRegistrationType,
} from '@o4o/types';

export interface MemberRegistrationFieldsProps {
  type: MemberRegistrationType | '';
  fields: Values;
  onTypeChange: (type: MemberRegistrationType) => void;
  onChange: (fields: Values) => void;
  disabled?: boolean;
  readOnly?: boolean;
  typeLocked?: boolean;
  onUpload?: (file: File) => void;
  onOpenDocument?: () => void;
}
/** Same public field contract for an applicant and a reviewing operator. */
export function MemberRegistrationFields({
  type,
  fields,
  onTypeChange,
  onChange,
  disabled = false,
  readOnly = false,
  typeLocked = false,
  onUpload,
  onOpenDocument,
}: MemberRegistrationFieldsProps) {
  const input =
    'mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 read-only:bg-slate-50 disabled:bg-slate-50';
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <label className="block text-sm">
        가입 유형
        <select
          aria-label="가입 유형"
          required
          className={input}
          disabled={readOnly || typeLocked}
          value={type}
          onChange={(event) =>
            onTypeChange(event.target.value as MemberRegistrationType)
          }
        >
          <option value="">선택해 주세요</option>
          {Object.entries(MEMBER_REGISTRATION_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {type &&
          registrationFieldKeys(type)
            .filter((key) => key !== 'businessRegistrationDocumentId')
            .map((key) => {
              const definition = MEMBER_REGISTRATION_FIELDS[key],
                required = [
                  'licenseNumber',
                  'businessName',
                  'businessNumber',
                ].includes(key);
              return (
                <label key={key} className="block text-sm">
                  {key === 'contactEmail' && type === 'supplier'
                    ? '공개 문의 이메일'
                    : definition.label}
                  {key === 'businessEntityType' ? (
                    <select
                      className={input}
                      disabled={readOnly}
                      value={fields[key] ?? ''}
                      onChange={(event) =>
                        onChange({ ...fields, [key]: event.target.value })
                      }
                    >
                      <option value="">선택 안 함</option>
                      <option value="individual">개인사업자</option>
                      <option value="corporation">법인사업자</option>
                    </select>
                  ) : (
                    <input
                      className={input}
                      required={required}
                      readOnly={readOnly}
                      type={
                        key.endsWith('Email')
                          ? 'email'
                          : key === 'businessStartDate'
                            ? 'date'
                            : 'text'
                      }
                      maxLength={definition.max}
                      value={fields[key] ?? ''}
                      onChange={(event) =>
                        onChange({ ...fields, [key]: event.target.value })
                      }
                    />
                  )}
                </label>
              );
            })}
      </div>
      {type && ['pharmacy_owner', 'supplier', 'partner'].includes(type) && (
        <div className="space-y-2 text-sm">
          {!readOnly && onUpload && (
            <label className="block">
              사업자등록증 첨부
              <span className="ml-2 text-slate-500">PDF·JPG·PNG, 8MB 이하</span>
              <input
                className={input}
                type="file"
                aria-label="사업자등록증 첨부"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUpload(file);
                    event.target.value = '';
                  }
                }}
              />
            </label>
          )}
          {fields.businessRegistrationDocumentId ? (
            <>
              <button
                type="button"
                disabled={!onOpenDocument}
                onClick={onOpenDocument}
              >
                사업자등록증 보기
              </button>
              {!readOnly && (
                <button
                  type="button"
                  className="ml-3"
                  onClick={() =>
                    onChange({ ...fields, businessRegistrationDocumentId: '' })
                  }
                >
                  첨부 해제
                </button>
              )}
            </>
          ) : (
            <span>사업자등록증 첨부 없음</span>
          )}
        </div>
      )}
    </fieldset>
  );
}
