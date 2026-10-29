import type { ProfessionalInfo } from '../api/lecture';
import { PROFESSIONAL_FIELDS } from '@o4o/operator-core-ui/modules/lecture-operations';
export { ProfessionalInfoSummary } from '@o4o/operator-core-ui/modules/lecture-operations';
export function ProfessionalInfoFields({ value, onChange }: { value: ProfessionalInfo; onChange: (value: ProfessionalInfo) => void }) {
  return <fieldset className="panel sub"><legend>전문 강의 안내</legend>
    <p className="muted">실무 학습 정보를 구체적으로 작성하세요. 전문 강의 수료는 공인 자격·법정 보수교육 이수를 뜻하지 않습니다.</p>
    {PROFESSIONAL_FIELDS.map(([key, label]) => <label className="field" key={key}><span>{label}</span>
      {key === 'reviewedAt' ? <input type="date" value={typeof value[key] === 'string' ? value[key] : ''} onChange={e => onChange({ ...value, [key]: e.target.value })} />
        : <textarea rows={3} maxLength={4000} value={typeof value[key] === 'string' ? value[key] : ''} onChange={e => onChange({ ...value, [key]: e.target.value })} />}
    </label>)}
  </fieldset>;
}
