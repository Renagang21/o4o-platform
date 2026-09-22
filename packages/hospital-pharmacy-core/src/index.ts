/**
 * @o4o/hospital-pharmacy-core — Hospital Pharmacy 얇은 Domain Core
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1
 *
 * O4O Main Automation Core 를 **소비만** 하고 재구현하지 않는다(단방향 의존 Hospital→Core).
 * 이 패키지가 소유: 병원약국 필드 정의 · GFU 주입용 TargetSchema · NormalizedRecord→도메인 adapter ·
 * 원내 Local Context 조회/표시 · 병원 도메인 자연어 파싱 · surface 실행 계획.
 * React/DOM/DB/네트워크/xlsx 의존 없음 — 브라우저·서버·테스트 공용 순수 계층.
 */

export {
  type HospitalDrugRecord,
  type HospitalDrugField,
  type HospitalDrugDataset,
  HOSPITAL_DRUG_STORAGE_KEY,
  HOSPITAL_DRUG_FILE_ACCEPT,
  makeHospitalDrugDataset,
  isHospitalDrugDataset,
} from './domain';

export {
  type HospitalTargetField,
  type HospitalTargetSchema,
  HOSPITAL_DRUG_TARGET_SCHEMA,
} from './target-schema';

export {
  mentionsHospital,
  mentionsSameIngredient,
  extractDrugNameToken,
  extractProduct,
  extractStrength,
} from './nl';

export {
  queryLocalRows,
  matchLocalByResearchIngredients,
  renderLocalContextBlock,
} from './local-context';

export {
  type NormalizedRecordLike,
  type HospitalRowsFromRecords,
  normalizedRecordToHospitalRow,
  normalizedRecordsToHospitalRows,
} from './adapter';

export {
  type HospitalSurfacePlan,
  decideHospitalSurfacePlan,
  HOSPITAL_QUESTION_ANSWER,
} from './plan';
