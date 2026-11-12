import { useEffect, useState, type ComponentType } from 'react';
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
  /** 유형을 앞 단계에서 이미 골랐을 때 유형 선택칸을 그리지 않는다(가입 신청 2단계 화면). */
  hideType?: boolean;
  onUpload?: (file: File) => void;
  onOpenDocument?: () => void;
  /**
   * 우편번호 검색(`@o4o/ui` AddressSearch 등)을 주입하면 우편번호 · 주소 · 상세 주소 칸을 검색 묶음으로 바꾼다.
   * 주입하지 않는 화면(Admin 정정 등)은 종전처럼 직접 입력한다.
   */
  AddressSearch?: ComponentType<AddressSearchProps>;
}
export interface AddressSearchProps {
  zipCode: string;
  address: string;
  addressDetail: string;
  onChange: (value: { zipCode: string; address: string; addressDetail: string }) => void;
  disabled?: boolean;
  inputClassName?: string;
}
const ADDRESS_KEYS = new Set(['zipCode', 'address', 'addressDetail']);

/**
 * 개업일 — 연 · 월 · 일 선택(2026-11-12 사용자 지적: 달력이 올해 이후부터 보여 오래된 개업 연도를 고르기 어렵다).
 * 연도는 올해부터 1950년까지 최신순이고 미래 날짜는 고를 수 없다. 값은 종전과 같은 YYYY-MM-DD.
 */
function DateParts({ value, onChange, disabled, className, label }: {
  value: string; onChange: (value: string) => void; disabled: boolean; className: string; label: string;
}) {
  const [y0, m0, d0] = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-') : ['', '', ''];
  const [parts, setParts] = useState({ y: y0, m: m0, d: d0 });
  useEffect(() => { setParts({ y: y0, m: m0, d: d0 }); }, [y0, m0, d0]);
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = Array.from({ length: thisYear - 1949 }, (_, i) => String(thisYear - i));
  const monthsMax = parts.y === String(thisYear) ? now.getMonth() + 1 : 12;
  const daysInMonth = parts.y && parts.m ? new Date(Number(parts.y), Number(parts.m), 0).getDate() : 31;
  const daysMax = parts.y === String(thisYear) && Number(parts.m) === now.getMonth() + 1 ? Math.min(daysInMonth, now.getDate()) : daysInMonth;
  const pad = (n: number) => String(n).padStart(2, '0');
  const update = (next: { y: string; m: string; d: string }) => {
    const fixed = { ...next };
    if (fixed.m && Number(fixed.m) > (fixed.y === String(thisYear) ? now.getMonth() + 1 : 12)) fixed.m = '';
    const dim = fixed.y && fixed.m ? new Date(Number(fixed.y), Number(fixed.m), 0).getDate() : 31;
    if (fixed.d && Number(fixed.d) > dim) fixed.d = '';
    setParts(fixed);
    onChange(fixed.y && fixed.m && fixed.d ? `${fixed.y}-${fixed.m}-${fixed.d}` : '');
  };
  const select = `${className} min-w-0`;
  return (
    <span className="mt-1 grid grid-cols-3 gap-2" role="group" aria-label={label}>
      <select aria-label={`${label} 연도`} className={select} disabled={disabled} value={parts.y} onChange={(e) => update({ ...parts, y: e.target.value })}>
        <option value="">연도</option>
        {years.map((y) => <option key={y} value={y}>{y}년</option>)}
      </select>
      <select aria-label={`${label} 월`} className={select} disabled={disabled} value={parts.m} onChange={(e) => update({ ...parts, m: e.target.value })}>
        <option value="">월</option>
        {Array.from({ length: monthsMax }, (_, i) => pad(i + 1)).map((m) => <option key={m} value={m}>{Number(m)}월</option>)}
      </select>
      <select aria-label={`${label} 일`} className={select} disabled={disabled} value={parts.d} onChange={(e) => update({ ...parts, d: e.target.value })}>
        <option value="">일</option>
        {Array.from({ length: daysMax }, (_, i) => pad(i + 1)).map((d) => <option key={d} value={d}>{Number(d)}일</option>)}
      </select>
    </span>
  );
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
  hideType = false,
  onUpload,
  onOpenDocument,
  AddressSearch,
}: MemberRegistrationFieldsProps) {
  const input =
    'mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 read-only:cursor-default read-only:bg-slate-100 read-only:text-slate-600 disabled:bg-slate-100';
  return (
    <fieldset disabled={disabled} className="space-y-3">
      {!hideType && <label className="block text-sm">
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
          <option value="">선택해 주시기 바랍니다</option>
          {Object.entries(MEMBER_REGISTRATION_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {type &&
          registrationFieldKeys(type)
            .filter((key) => key !== 'businessRegistrationDocumentId')
            .filter((key) => !AddressSearch || !ADDRESS_KEYS.has(key) || key === 'zipCode')
            .map((key) => {
              if (AddressSearch && key === 'zipCode')
                return (
                  <div key="address-search" className="text-sm md:col-span-2">
                    <AddressSearch
                      zipCode={fields.zipCode ?? ''}
                      address={fields.address ?? ''}
                      addressDetail={fields.addressDetail ?? ''}
                      disabled={disabled || readOnly}
                      inputClassName="block w-full rounded border border-slate-300 px-3 py-2 read-only:bg-slate-100 read-only:text-slate-600 disabled:bg-slate-100 disabled:text-slate-600"
                      onChange={(value) => onChange({ ...fields, ...value })}
                    />
                  </div>
                );
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
                  {key === 'businessStartDate' ? (
                    <DateParts
                      label={definition.label}
                      className={input.replace('mt-1 ', '')}
                      disabled={disabled || readOnly}
                      value={fields[key] ?? ''}
                      onChange={(value) => onChange({ ...fields, [key]: value })}
                    />
                  ) : key === 'businessEntityType' ? (
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
                      type={key.endsWith('Email') ? 'email' : 'text'}
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
