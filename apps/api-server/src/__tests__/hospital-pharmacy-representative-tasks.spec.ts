/**
 * 병원약국 대표 업무 6종 E2E (결정론 · WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §1)
 *
 * WO §1 예시 6종을, 실제 두 표면이 내리는 판정을 그대로 재현해 고정한다:
 *   - 서버 라우팅(performHospitalDrugRequest): 공통 classifyTaskModality → screen 이면 Work,
 *     그 밖은 hospital-pharmacy-core 의 decideHospitalSurfacePlan(suppressLocal=true · Local-first).
 *   - 병동 브라우저 라우팅(WardPage): 원내 보유(local_only)는 브라우저 원내 데이터로 완전히 답하고,
 *     동일성분(research_and_local)은 서버 조사 위에 원내 Context 를 브라우저에서 얹는다.
 *
 * 단방향 의존을 그대로 검증한다: 공통 Core(classifyTaskModality)를 **소비**하고, 병원 도메인 판정/원내 결합은
 * @o4o/hospital-pharmacy-core 가 소유한다. AI 호출 0(modality 판정·순수 함수만) — 완전 결정론.
 */

import {
  decideHospitalSurfacePlan,
  mentionsHospital,
  mentionsSameIngredient,
  extractProduct,
  extractStrength,
  queryLocalRows,
  matchLocalByResearchIngredients,
  renderLocalContextBlock,
  normalizedRecordsToHospitalRows,
  makeHospitalDrugDataset,
  type HospitalDrugDataset,
  type NormalizedRecordLike,
} from '@o4o/hospital-pharmacy-core';
import { classifyTaskModality } from '../services/ai-tools/task-modality-router';

// ── 원내 데이터셋 픽스처 — GFU 정규화 레코드(약제부 파일 이해 결과)를 adapter 로 도메인 행으로. ──
const GFU_RECORDS: NormalizedRecordLike[] = [
  { fields: { product_name: '타이레놀정500mg', ingredient: '아세트아미노펜', strength: '500mg', dosage_form: '정제' } },
  { fields: { product_name: '써스펜좌약', ingredient: '아세트아미노펜', strength: '125mg', dosage_form: '좌제' } },
  { fields: { product_name: '아모디핀정', ingredient: '암로디핀', strength: '5mg' } },
  { fields: { product_name: '무코스타정', ingredient: '레바미피드', strength: '100mg' } },
];

function buildDataset(): HospitalDrugDataset {
  const { rows } = normalizedRecordsToHospitalRows(GFU_RECORDS);
  return makeHospitalDrugDataset('원내보유목록.xlsx', rows, '2026-09-22T00:00:00.000Z');
}

// ── 서버 표면 재현(performHospitalDrugRequest · localSource='client' → suppressLocal=true). ──
type ServerRoute = { kind: 'work' } | { kind: 'chat'; plan: string };
function serverRoute(text: string): ServerRoute {
  const modality = classifyTaskModality({ request: text, image: null }).modality;
  if (modality === 'screen') return { kind: 'work' };
  return { kind: 'chat', plan: decideHospitalSurfacePlan(text, modality, true) };
}

describe('병원약국 대표 업무 6종 E2E (§1)', () => {
  const dataset = buildDataset();

  // 1) 원내 보유 확인 — 브라우저 원내 데이터로 완전히 답한다(서버 불요).
  it('① 원내 보유 확인: "우리 원내에 아세트아미노펜 있어?" → 원내 데이터 2건', () => {
    const text = '우리 원내에 아세트아미노펜 있어?';
    expect(mentionsHospital(text)).toBe(true);
    expect(mentionsSameIngredient(text)).toBe(false);
    // 원내 지시 + 동일성분 아님 → 병동은 local_only(브라우저).
    const matches = queryLocalRows(dataset.rows, ['아세트아미노펜'], { limit: 50 });
    expect(matches.map((r) => r.product_name).sort()).toEqual(['써스펜좌약', '타이레놀정500mg']);
    expect(renderLocalContextBlock(matches, extractStrength(text))).toContain('[원내 약품] 2건 확인');
  });

  // 2) 동일성분 원내약 — 서버는 조사만(Local-first), 원내 결합은 브라우저.
  it('② 동일성분 원내약: "아모디핀정과 같은 성분 원내약 있어?" → 서버 research + 브라우저 원내 결합', () => {
    const text = '아모디핀정과 같은 성분 원내약 있어?';
    expect(extractProduct(text)).toBe('아모디핀정');
    expect(mentionsSameIngredient(text)).toBe(true);
    // 서버 호환 경로(suppressLocal=false)는 research_and_local, Local-first(true)는 research.
    expect(decideHospitalSurfacePlan(text, 'question', false)).toBe('research_and_local');
    expect(serverRoute(text)).toEqual({ kind: 'chat', plan: 'research' });
    // 브라우저: 서버 조사 본문에 등장한 성분(암로디핀)으로 동일성분 원내약을 근사.
    const researchReply = '이 약의 주성분은 암로디핀으로, 칼슘채널차단제입니다.';
    const merged = matchLocalByResearchIngredients(dataset.rows, researchReply, 50);
    expect(merged.map((r) => r.product_name)).toEqual(['아모디핀정']);
  });

  // 3) 대체약 조사 — 순수 조사(원내 결합 없음).
  it('③ 대체약 조사: "아모디핀정 대체약을 조사해줘" → research', () => {
    const text = '아모디핀정 대체약을 조사해줘';
    expect(extractProduct(text)).toBe('아모디핀정');
    expect(mentionsSameIngredient(text)).toBe(false); // 대체약 ≠ 동일성분
    expect(mentionsHospital(text)).toBe(false);
    expect(serverRoute(text)).toEqual({ kind: 'chat', plan: 'research' });
  });

  // 4) 성분·주의사항 조사 — 제품 지정 조사.
  it('④ 성분·주의사항 조사: "타이레놀정500mg의 성분과 주의사항을 조사해줘" → research', () => {
    const text = '타이레놀정500mg의 성분과 주의사항을 조사해줘';
    expect(extractProduct(text)).toBe('타이레놀정500mg');
    expect(serverRoute(text)).toEqual({ kind: 'chat', plan: 'research' });
  });

  // 5) 주문 가능 확인 — 원내 프로그램 화면 조작 → 공통 Work Agent(screen).
  it('⑤ 주문 가능 확인: "원내 처방 프로그램 화면에서 이 약 주문 가능한지 확인해줘" → work(screen)', () => {
    const text = '원내 처방 프로그램 화면에서 이 약 주문 가능한지 확인해줘';
    expect(classifyTaskModality({ request: text, image: null }).modality).toBe('screen');
    expect(serverRoute(text)).toEqual({ kind: 'work' });
  });

  // 6) 병원 프로그램 재고 — 재고 프로그램 화면 조작 → 공통 Work Agent(screen).
  it('⑥ 병원 프로그램 재고: "병원 재고 프로그램 화면에서 타이레놀정 재고를 확인해줘" → work(screen)', () => {
    const text = '병원 재고 프로그램 화면에서 타이레놀정 재고를 확인해줘';
    expect(classifyTaskModality({ request: text, image: null }).modality).toBe('screen');
    expect(serverRoute(text)).toEqual({ kind: 'work' });
  });
});
