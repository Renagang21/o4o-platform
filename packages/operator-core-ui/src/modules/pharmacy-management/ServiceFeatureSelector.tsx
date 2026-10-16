interface Props {
  features: Array<{ key: string; label: string }>;
  selected: string[];
  disabled: boolean;
  onChange: (selected: string[]) => void;
}

export function ServiceFeatureSelector({ features, selected, disabled, onChange }: Readonly<Props>) {
  return <fieldset disabled={disabled} className="space-y-2 rounded border border-gray-200 p-3">
    <legend className="px-1 text-sm font-medium">제공 기능</legend>
    <p className="text-xs text-gray-500">승인된 가입 약국에 제공할 기능을 선택하세요. 선택하지 않은 기능은 이 사업에서 추가 제공하지 않습니다.</p>
    <div className="flex flex-wrap gap-4">
      {features.map(feature => <label key={feature.key} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={selected.includes(feature.key)} onChange={event => onChange(
          event.target.checked ? [...selected, feature.key] : selected.filter(key => key !== feature.key),
        )} />
        {feature.label}
      </label>)}
    </div>
  </fieldset>;
}
