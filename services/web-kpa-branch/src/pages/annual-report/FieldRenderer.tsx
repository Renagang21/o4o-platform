/**
 * FieldRenderer — Template 의 field 1개를 그린다
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 §2
 *
 * 이 파일은 **필드 key 를 하나도 모른다.** type/options/readonly 만 보고 그린다.
 * 2027 양식에서 필드가 바뀌어도 이 파일은 그대로다.
 */
import type { FieldDefinition, FieldOption } from '../../lib/api/annualReport';

const inputClass = 'w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500';

export interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
  /** association 필드가 아직 연결 원장이 없을 때 */
  notLinked?: boolean;
  issue?: string;
}

export default function FieldRenderer({ field, value, onChange, disabled, notLinked, issue }: FieldRendererProps) {
  const locked = disabled || field.readonly;
  const set = (v: unknown) => onChange(field.key, v);

  return (
    <div className="py-2">
      <label className="block">
        <span className="mb-1 block text-sm text-gray-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-600">*</span>}
          {field.ownership === 'association' && (
            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">약사회 관리</span>
          )}
        </span>

        {renderControl(field, value, set, !!locked, notLinked)}
      </label>

      {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
      {notLinked && (
        <p className="mt-1 text-xs text-amber-700">
          연결된 원장이 없어 표시할 수 없습니다. 분회 사무국에 확인이 필요합니다.
        </p>
      )}
      {issue && <p className="mt-1 text-xs text-red-600">{issue}</p>}
    </div>
  );
}

function renderControl(
  field: FieldDefinition,
  value: unknown,
  set: (v: unknown) => void,
  locked: boolean,
  notLinked?: boolean,
) {
  const options: FieldOption[] = field.options ?? [];

  switch (field.type) {
    case 'readonly_display':
      return (
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {notLinked ? <span className="text-gray-400">미연결 · 확인 필요</span> : displayValue(value, options)}
        </div>
      );

    case 'consent':
      return (
        <div className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2">
          <input
            type="checkbox"
            checked={value === true}
            disabled={locked}
            onChange={(e) => set(e.target.checked)}
          />
          <span className="text-sm text-gray-700">위 내용에 동의합니다</span>
        </div>
      );

    case 'radio':
      return (
        <div className="flex flex-wrap gap-x-5 gap-y-2 py-1">
          {options.map((o) => (
            <label key={String(o.value)} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name={field.key}
                checked={value === o.value}
                disabled={locked}
                onChange={() => set(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      );

    case 'select':
      return (
        <select
          className={inputClass}
          value={value === undefined || value === null ? '' : String(value)}
          disabled={locked}
          onChange={(e) => set(coerce(e.target.value, options))}
        >
          <option value="">선택하세요</option>
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as unknown[]) : [];
      // group 이 있으면 층위를 보존해 묶어 보여준다 (미활동 사유의 "6개월 이상 …")
      const groups = new Map<string, FieldOption[]>();
      for (const o of options) {
        const g = o.group ?? '';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(o);
      }
      return (
        <div className="space-y-2 rounded border border-gray-200 p-3">
          {[...groups.entries()].map(([g, opts]) => (
            <div key={g}>
              {g && <p className="mb-1 text-xs font-medium text-gray-500">{g}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {opts.map((o) => (
                  <label key={String(o.value)} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={arr.includes(o.value)}
                      disabled={locked}
                      onChange={(e) =>
                        set(e.target.checked ? [...arr, o.value] : arr.filter((v) => v !== o.value))
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'checkbox':
      return (
        <input type="checkbox" checked={value === true} disabled={locked} onChange={(e) => set(e.target.checked)} />
      );

    case 'textarea':
      return (
        <textarea
          className={inputClass}
          rows={4}
          value={value == null ? '' : String(value)}
          disabled={locked}
          onChange={(e) => set(e.target.value)}
        />
      );

    case 'file':
      // 업로드 파이프라인 연결은 후속 분리 (WO §11). 필드는 표시하되 입력은 막는다.
      return (
        <div className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
          파일 첨부는 준비 중입니다. 분회 사무국으로 제출해 주세요.
        </div>
      );

    case 'signature':
      return (
        <input
          className={inputClass}
          placeholder="성명을 입력하면 서명으로 갈음합니다"
          value={value == null ? '' : String(value)}
          disabled={locked}
          onChange={(e) => set(e.target.value)}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          className={inputClass}
          value={value == null ? '' : String(value)}
          disabled={locked}
          onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );

    default:
      return (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'tel' ? 'tel' : 'text'}
          className={inputClass}
          value={value == null ? '' : String(value)}
          disabled={locked}
          onChange={(e) => set(e.target.value)}
        />
      );
  }
}

/** select 는 문자열만 돌려주므로 원래 타입(boolean/number)으로 되돌린다 */
function coerce(raw: string, options: FieldOption[]): unknown {
  const hit = options.find((o) => String(o.value) === raw);
  return hit ? hit.value : raw;
}

function displayValue(value: unknown, options: FieldOption[]): string {
  if (value === undefined || value === null || value === '') return '—';
  const hit = options.find((o) => o.value === value);
  if (hit) return hit.label;
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}
