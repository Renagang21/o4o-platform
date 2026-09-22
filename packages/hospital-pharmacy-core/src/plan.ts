/**
 * Hospital Pharmacy — surface 실행 계획 (순수 판정)
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §1·§5
 *
 * modality(공통 classifyTaskModality 결과) + 병원 표면 컨텍스트 → 어떤 답을 조립할지 결정한다.
 *   research           — 순수 조사(grounded). 원내 컨텍스트 불필요.
 *   research_and_local — 조사 + 원내 Context 결합(예: 동일성분 원내 보유).
 *   local_only         — 원내 Context 만(예: "원내에 이 약 있어?"). 웹 호출 없음.
 *   question           — 무엇을·어디서 가 불분명 → 되묻는다(QUESTION 은 정상 상태, §6).
 *
 * 도메인 어휘(원내·동일성분)는 여기서만 판정한다 — 공통 Task Modality Router 는 오염시키지 않는다.
 * modality 는 Core 의 TaskModality 와 구조적으로 호환되는 string 으로 받는다(Core 를 import 하지 않음).
 *
 * V1(Local-first): 원내 데이터는 브라우저가 처리하므로 표면은 보통 suppressLocal=true 로 부른다 —
 * 이때 서버 원내 조회를 열지 않고 research/question 만 서버에서 받고, 원내 결합은 브라우저가 자기
 * 로컬 데이터로 한다(원내 파일은 서버로 올라오지 않는다). suppressLocal=false 는 서버 원내 경로가
 * 살아 있는 기존 /hospital-drug 호환 경로다.
 */

import { extractProduct, mentionsHospital, mentionsSameIngredient } from './nl';

export type HospitalSurfacePlan = 'research' | 'research_and_local' | 'local_only' | 'question';

export function decideHospitalSurfacePlan(
  message: string,
  modality: string,
  suppressLocal = false,
): HospitalSurfacePlan {
  const product = extractProduct(message);
  const hospital = mentionsHospital(message);
  const sameIngredient = mentionsSameIngredient(message);

  if (!suppressLocal) {
    if (product && sameIngredient) return 'research_and_local';
    if (product && hospital) return 'local_only';
  } else if (product && sameIngredient) {
    // 동일성분: 서버는 조사만, 원내 결합은 브라우저(client-local).
    return 'research';
  }
  if (modality === 'research') return 'research';
  if (product) return 'research';
  return 'question';
}

/** question plan 일 때 되묻는 표준 문구(§6 — QUESTION 은 실패가 아니라 정상 진행). */
export const HOSPITAL_QUESTION_ANSWER =
  '어떤 약품에 대해, 무엇을 도와드릴까요? 예) "타이레놀정의 효능을 조사해줘" · "이 약과 같은 성분의 원내약 있어?"';
