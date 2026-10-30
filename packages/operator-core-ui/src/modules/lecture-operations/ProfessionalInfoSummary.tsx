import type { ProfessionalInfo } from './types';
export const PROFESSIONAL_FIELDS: Array<[keyof ProfessionalInfo, string]> = [
  ['audience', '학습 대상'], ['outcomes', '수강 후 할 수 있는 일'], ['prerequisites', '선수 지식'],
  ['instructorBio', '강사 소개'], ['expertise', '강사 전문 분야'], ['reviewedAt', '자료 최종 검토일'],
];
export function ProfessionalInfoSummary({ value }: { value?: ProfessionalInfo }) {
  if (!value || !PROFESSIONAL_FIELDS.some(([key]) => typeof value[key] === 'string' && value[key])) return null;
  return <section className="panel"><h2>이 강의의 학습 안내</h2><dl>{PROFESSIONAL_FIELDS.map(([key, label]) => typeof value[key] === 'string' && value[key] ? <div key={key}><dt><strong>{label}</strong></dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value[key]}</dd></div> : null)}</dl>
    <p className="muted">공인 자격·법정 보수교육 이수 여부는 해당 기관의 별도 인정 기준을 확인하세요.</p></section>;
}
