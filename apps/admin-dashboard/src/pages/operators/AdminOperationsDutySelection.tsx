import { CENTRAL_OPERATION_MENUS } from '@o4o/types';
import { CENTRAL_OPERATION_SERVICES } from './central-operation-groups';

export const DAILY_OPERATION_MENUS = CENTRAL_OPERATION_MENUS.filter(menu => menu.minimumRole === 'operator');
const groups = CENTRAL_OPERATION_SERVICES.map(([service, label]) => ({ service, label, menus: DAILY_OPERATION_MENUS.filter(menu => menu.service === service) }));
export default function AdminOperationsDutySelection({ value, onChange, disabled, expanded }: {
  value: string[]; onChange(keys: string[]): void; disabled: boolean; expanded: boolean;
}) {
  const toggle = (key: string, checked: boolean) => onChange(checked ? [...value, key] : value.filter(item => item !== key));
  return <fieldset disabled={disabled} className="my-4 rounded border p-3"><legend>담당 일상업무</legend>
    <details open={expanded}>
      <summary className="cursor-pointer py-2">{value.length === DAILY_OPERATION_MENUS.length ? '일상업무 전체' : '선택한 일상업무'} {value.length}개 · 선택 변경</summary>
      <div className="mb-4 flex gap-4"><button type="button" onClick={() => onChange(DAILY_OPERATION_MENUS.map(menu => menu.key))}>일상업무 전체 선택</button><button type="button" onClick={() => onChange([])}>선택 해제</button></div>
      {groups.map(group => <section key={group.service} className="mb-4"><h3 className="mb-2 font-medium">{group.label}</h3>
        <div className="grid gap-2 sm:grid-cols-2">{group.menus.map(menu => <label key={menu.key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={value.includes(menu.key)} onChange={event => toggle(menu.key, event.target.checked)} />{menu.label}</label>)}</div>
      </section>)}
      {!value.length && <p className="text-amber-800">담당 업무가 없으면 업무 운영 화면을 이용할 수 없습니다.</p>}
    </details>
  </fieldset>;
}
