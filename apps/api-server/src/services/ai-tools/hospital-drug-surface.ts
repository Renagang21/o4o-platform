/**
 * Hospital Drug Surface — /hospital-drug 화면을 공통 Goal-driven Core 에 연결하는 얇은 계층
 *
 * WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §1·§2·§4·§5·§6·§8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈이 하는 일 / 하지 않는 일
 *
 *   §1 — /hospital-drug 요청을 **별도 AI 엔진 없이** 공통 Core 로 흘려보낸다.
 *     modality 판정은 공통 `classifyTaskModality`(Capability C)가 한다. 이 모듈은
 *     그 판정 결과 위에서 hospital-drug 고유 **Context(원내 약품 데이터)** 만 필요할 때 얹는다.
 *
 *   §2 — surface='hospital-drug' 가 제공하는 것은 "이 화면은 원내 약품 업무 화면이고,
 *     연결된 원내 약품 데이터가 있다" 는 **표면 컨텍스트**뿐이다. 질문이 원내 데이터를
 *     필요로 할 때만(Local Context) 쓰인다. Source(health.kr) 를 고정하지 않는다.
 *
 *   §4 — research 요청은 공통 `runWebResearch`(admin 모델 SSOT → Gemini grounding)로 간다.
 *     특정 약품/사이트 하드코딩 없음. 범용 grounded research.
 *
 *   §5 — screen 요청(현재 화면을 보고 판단·조작)은 이 모듈이 아니라 HTTP 계층에서 공통
 *     Work Agent(performWorkAgentRun → Capability C → provider=openai → Astra)로 위임한다.
 *     이 모듈은 research / local-context / question 만 조립한다.
 *
 *   §6 — 원내 데이터는 기존 Local SQLite 경로(`queryLocal`)를 재사용한다. 새 저장소·새
 *     public API 를 만들지 않는다. Local Context 는 라우터 판정과 별개다(라우터=task modality,
 *     surface=context 제공).
 *
 *   금지(§10) — 공공 API · health.kr canonical 강제 · HIRA/MFDS 코드 · hospital-drug 전용
 *     provider router · 새 Workflow Engine · 전역 provider 변경. 도메인 어휘(원내·동일성분)는
 *     이 surface 모듈에만 두고 공통 Task Modality Router 에는 넣지 않는다.
 *
 * DB 직접 접근 없음(주입된 executor·research fn 만 사용) → 결정론적 테스트 가능.
 */

import type { AIGroundingMetadata } from '@o4o/ai-core';
import type { TaskModality } from './task-modality-router.js';
import {
  extractProduct,
  extractStrength,
  mentionsHospital,
  mentionsSameIngredient,
  queryLocal,
  renderLocalBlock,
  type CompositeToolExecutor,
} from './hospital-drug-composite.js';

/** research 실행 결과(=runWebResearch 응답 축약). 테스트는 가짜를 주입한다. */
export interface SurfaceResearchResult {
  content: string;
  model: string;
  grounding?: AIGroundingMetadata;
}

export interface HospitalDrugSurfaceDeps {
  /** 원내(Local SQLite) 조회 executor — 실사용은 `executeAiTool` 을 감싼다(권한 게이트 유지). */
  exec: CompositeToolExecutor;
  /** 범용 Web Research(Gemini grounding) — 실사용은 `runWebResearch`. */
  research: (query: string) => Promise<SurfaceResearchResult>;
}

/**
 * surface 가 조립하는 답 종류.
 *   research           — 순수 조사(grounded). 원내 컨텍스트 불필요.
 *   research_and_local — 조사 + 원내 Context 결합(예: 동일성분 원내 보유).
 *   local_only         — 원내 Context 만(예: "원내에 이 약 있어?"). 웹 호출 없음.
 *   question           — 무엇을·어디서 가 불분명 → 되묻는다(공통 question modality 보존).
 */
export type HospitalDrugSurfacePlan = 'research' | 'research_and_local' | 'local_only' | 'question';

export interface HospitalDrugSurfaceResult {
  /** 사용자에게 보여줄 최종 한국어 답. */
  answer: string;
  plan: HospitalDrugSurfacePlan;
  /** 문장에서 뽑은 제품 토큰(없으면 null). */
  product: string | null;
  /** research(runWebResearch) 를 호출했는가. */
  usedResearch: boolean;
  /** 원내 Local 조회를 호출했는가. */
  usedLocal: boolean;
  /** research 에 사용된 모델(호출 시). */
  researchModel?: string;
  /** grounding.used(호출 시). */
  groundingUsed?: boolean;
  /** 원내 조회 결과 요약(값 원문·raw row 없음): 'rows:N' | 'empty' | 'unavailable' | 'denied'. */
  localOutcome?: string;
}

/**
 * modality + hospital-drug 표면 컨텍스트 → 실행 계획.
 *
 *   원내(원내) 지시가 있으면 Local Context 가 필요하다:
 *     - 동일성분 + 원내 → research_and_local (조사로 성분/효능 근거 + 원내 보유 Context)
 *     - 원내만          → local_only
 *   원내 지시가 없으면 공통 판정을 따른다:
 *     - modality=research → research
 *     - 그 밖에 제품 토큰이 있으면 → research (약품 질문의 표면 기본값 = 조사; 파괴적 행위 없음)
 *     - 아무 단서도 없으면 → question
 *
 * 도메인 어휘(원내·동일성분)는 여기서만 판정한다 — 공통 Task Modality Router 는 오염시키지 않는다(§5·§10).
 */
export function decideHospitalDrugSurfacePlan(message: string, modality: TaskModality): HospitalDrugSurfacePlan {
  const product = extractProduct(message);
  const hospital = mentionsHospital(message);
  const sameIngredient = mentionsSameIngredient(message);

  if (product && sameIngredient) return 'research_and_local';
  if (product && hospital) return 'local_only';
  if (modality === 'research') return 'research';
  if (product) return 'research';
  return 'question';
}

const QUESTION_ANSWER =
  '어떤 약품에 대해, 무엇을 도와드릴까요? 예) "타이레놀정의 효능을 조사해줘" · "이 약과 같은 성분의 원내약 있어?"';

/** 원내 조회 결과 → 로그·smoke 용 요약(값 원문 없음). */
function summarizeLocal(block: { unavailable: boolean; rowCount: number }, ok: boolean, reason?: string): string {
  if (!ok) return reason ?? 'denied';
  if (block.unavailable) return 'unavailable';
  if (block.rowCount === 0) return 'empty';
  return `rows:${block.rowCount}`;
}

/**
 * /hospital-drug 요청 실행(research / research_and_local / local_only / question).
 * screen 은 호출측(HTTP 계층)이 공통 Work Agent 로 위임하므로 여기 오지 않는다.
 *
 * @param deps 주입된 executor(원내 조회)·research fn(runWebResearch)
 * @param message 사용자 자연어
 * @param modality 공통 `classifyTaskModality` 판정의 modality (screen 제외)
 */
export async function runHospitalDrugSurface(
  deps: HospitalDrugSurfaceDeps,
  message: string,
  modality: TaskModality,
): Promise<HospitalDrugSurfaceResult> {
  const product = extractProduct(message);
  const strength = extractStrength(message);
  const plan = decideHospitalDrugSurfacePlan(message, modality);

  // ── question — 되묻는다(공통 question modality 보존). ──────────────────────────
  if (plan === 'question') {
    return { answer: QUESTION_ANSWER, plan, product, usedResearch: false, usedLocal: false };
  }

  // ── local_only — 원내 Context 만. 웹 호출 없음(§6). ───────────────────────────
  if (plan === 'local_only') {
    const local = await queryLocal(deps.exec, 'product_name', product ?? message);
    const block = renderLocalBlock(local.data, strength);
    const head = product ? `'${product}' 의 원내 보유 여부를 확인했습니다.` : '원내 보유 여부를 확인했습니다.';
    return {
      answer: `${head}\n\n${block.text}`,
      plan,
      product,
      usedResearch: false,
      usedLocal: true,
      localOutcome: summarizeLocal(block, local.ok, local.reason),
    };
  }

  // ── research — 순수 grounded 조사(§4). 특정 Source 강제 없음. ──────────────────
  if (plan === 'research') {
    const res = await deps.research(message);
    return {
      answer: res.content,
      plan,
      product,
      usedResearch: true,
      usedLocal: false,
      researchModel: res.model,
      groundingUsed: res.grounding?.used === true,
    };
  }

  // ── research_and_local — 조사(성분/효능 근거) + 원내 Context 결합(§8-C). ───────
  const res = await deps.research(message);
  const local = await queryLocal(deps.exec, 'product_name', product ?? message);
  const block = renderLocalBlock(local.data, strength);
  const contextHead = product ? `[원내 약품] '${product}' 관련 원내 보유 현황` : '[원내 약품] 원내 보유 현황';
  return {
    answer: `${res.content}\n\n${contextHead}\n${block.text}`,
    plan,
    product,
    usedResearch: true,
    usedLocal: true,
    researchModel: res.model,
    groundingUsed: res.grounding?.used === true,
    localOutcome: summarizeLocal(block, local.ok, local.reason),
  };
}
