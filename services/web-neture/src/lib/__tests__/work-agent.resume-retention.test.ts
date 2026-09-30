/**
 * WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1 §2-B·§2-C — 재개 앵커(client, 순수 계층)
 *
 *   재개 시도 한 번 실패로 대기 중인 run 을 버리지 않는다. 종료 · 거부가 확정될 때만 해제한다.
 *   앵커는 원래 run 의 대상을 함께 들고 있어, 짧은 답변에서 대상을 다시 찾지 않게 한다.
 */

import { describe, expect, it } from 'vitest';
import { nextResumeAnchor, WORK_AGENT_RESUME_REJECTED, type ResumeAnchor } from '../ai/work-agent';

const A: ResumeAnchor = { runId: 'g_a', targetId: 'healthkr' };

describe('nextResumeAnchor', () => {
  it('QUESTION(resumable) 응답이면 그 runId 와 그 run 의 대상을 앵커로 둔다', () => {
    expect(nextResumeAnchor(null, { runId: 'g_a', resumable: true, errorCode: null, goal: { siteId: 'healthkr' } })).toEqual(A);
    expect(nextResumeAnchor(A, { runId: 'g_a', resumable: true, errorCode: null, goal: { siteId: 'healthkr' } })).toEqual(A);
  });

  it('응답에 대상이 비어 있으면 직전 앵커의 대상을 이어 쓴다', () => {
    expect(nextResumeAnchor(A, { runId: 'g_a', resumable: true, errorCode: null, goal: { siteId: null } })).toEqual(A);
  });

  it('run 을 열기 전에 멈춘 재개 실패(runId 없음)는 직전 앵커를 유지한다', () => {
    expect(nextResumeAnchor(A, { runId: null, resumable: false, errorCode: 'WORK_AGENT_SITE_UNRESOLVED' })).toEqual(A);
    expect(nextResumeAnchor(A, { runId: null, resumable: false, errorCode: 'WORK_AGENT_SITE_NOT_READY' })).toEqual(A);
  });

  it('재개 거부가 확정되면 해제한다', () => {
    expect(nextResumeAnchor(A, { runId: null, resumable: false, errorCode: WORK_AGENT_RESUME_REJECTED })).toBeNull();
  });

  it('run 이 열린 채 끝나면(완료 · 인계 · 중지) 해제한다', () => {
    expect(nextResumeAnchor(A, { runId: 'g_a', resumable: false, errorCode: null })).toBeNull();
  });

  it('앵커가 없던 새 요청의 실패는 그대로 없음', () => {
    expect(nextResumeAnchor(null, { runId: null, resumable: false, errorCode: 'WORK_AGENT_SITE_UNRESOLVED' })).toBeNull();
  });
});
