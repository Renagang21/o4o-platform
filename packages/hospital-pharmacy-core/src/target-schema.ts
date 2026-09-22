/**
 * Hospital Pharmacy — Generic File Understanding 에 주입할 TargetSchema
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §2·§3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 D1(원내 Excel = GFU 전면 전환)을 실현한다.
 *
 *   기존 브라우저 별칭 파서(HEADER_ALIASES)는 "제품명/약품명/품목명/원내명…" 컬럼명을 코드로 계속
 *   쫓았다. 그 방식을 폐기하고, **어떤 값이 어떤 필드인지의 의미**를 자연어 description 으로만 준다.
 *   컬럼→필드 매핑의 판단은 공통 GFU(AI 구조 이해)가 하고, 전체 행 정규화는 GFU 가 결정론적으로 한다.
 *
 *   TargetSchema 의 shape 은 공통 Core(contract.ts)의 TargetSchema 와 구조적으로 동일하다.
 *   Core 를 import 하지 않는다(단방향 의존 · Hospital→Core) — api-server 소비 지점에서 이 객체를
 *   그대로 GFU 에 넘긴다(structural typing). examples 는 결정론적 alias 표가 아니라 AI 힌트일 뿐이다.
 *
 *   required 는 product_name 하나뿐 — 성분/함량/제형/제조사/재고는 파일에 있으면 채우고 없으면 비운다.
 */

/** GFU TargetSchema 와 구조적으로 호환되는 로컬 타입(Core 를 import 하지 않기 위해 자체 선언). */
export interface HospitalTargetField {
  key: string;
  description: string;
  required: boolean;
  examples?: string[];
}

export interface HospitalTargetSchema {
  id: string;
  fields: HospitalTargetField[];
}

/**
 * 원내 약품 목록 TargetSchema. key 는 HospitalDrugRecord 필드와 1:1.
 * description 은 AI 가 컬럼 의미를 판단하도록 돕는 자연어(별칭 나열이 아니라 의미 설명 위주).
 */
export const HOSPITAL_DRUG_TARGET_SCHEMA: HospitalTargetSchema = {
  id: 'hospital-drug-list.v1',
  fields: [
    {
      key: 'product_name',
      description:
        '원내에서 부르는 약품(의약품)의 제품명·품목명. 병원이 실제로 보유·사용하는 약의 이름 열. 성분명이 아니라 상품/제품 단위 이름.',
      required: true,
      examples: ['타이레놀정500mg', '아모디핀정', '무코스타정'],
    },
    {
      key: 'ingredient',
      description: '약의 주성분(일반명·성분명). 제품명이 아니라 성분 그 자체.',
      required: false,
      examples: ['아세트아미노펜', '암로디핀', '레바미피드'],
    },
    {
      key: 'strength',
      description: '함량·규격·용량(수치와 단위). 한 정/한 병당 성분량.',
      required: false,
      examples: ['500mg', '5mg', '100ml'],
    },
    {
      key: 'dosage_form',
      description: '제형·제제 형태(먹는약/바르는약/주사 등 형태 구분).',
      required: false,
      examples: ['정제', '캡슐', '시럽', '주사'],
    },
    {
      key: 'manufacturer',
      description: '제조사·제약회사·공급 업체 이름.',
      required: false,
      examples: ['한국얀센', '대웅제약'],
    },
    {
      key: 'status',
      description: '재고·보유 상태나 비고·메모 등 부가 정보(있으면).',
      required: false,
      examples: ['재고있음', '단종', '비고'],
    },
  ],
};
