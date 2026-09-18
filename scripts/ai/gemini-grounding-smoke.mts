/**
 * Gemini Web Research (grounding) 실측 스모크
 * WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1 §6
 *
 * 목적: 실제 Gemini 모델이 google_search grounding 을 지원하고 응답에
 *       groundingMetadata(citation/query)를 실제로 담는지 실측한다.
 *
 * 실행(키는 env 로만 주입 — 코드·로그에 기록하지 않는다):
 *   GEMINI_API_KEY=... npx tsx scripts/ai/gemini-grounding-smoke.mts
 *   (선택) GEMINI_MODEL=gemini-2.5-flash
 *
 * 판정:
 *   - grounding.used === true 이고 sources 가 1건 이상이면 PASS(exit 0).
 *   - groundingMetadata 부재(used=false)면 grounded research 로 간주하지 않는다 → FAIL(exit 1).
 *   - 키 부재면 실행하지 않고 PENDING 안내(exit 2). PASS 로 보고하지 않는다.
 */

import { execute } from '../../packages/ai-core/src/orchestration/execute.js';

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  '';

if (!apiKey) {
  console.error(
    '[PENDING] GEMINI_API_KEY 가 env 에 없습니다. 키를 env 로 주입한 뒤 재실행하세요.\n' +
      '  GEMINI_API_KEY=<key> npx tsx scripts/ai/gemini-grounding-smoke.mts\n' +
      '  (키는 코드·문서·로그에 기록하지 않습니다.)',
  );
  process.exit(2);
}

const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function main() {
  const r = await execute({
    systemPrompt: '너는 근거를 검색해 답하는 리서치 어시스턴트다. 최신 웹 검색 결과에 근거해 간결히 답하라.',
    userPrompt: '2024년 노벨 물리학상 수상자는 누구이며 수상 사유는 무엇인가?',
    provider: 'gemini',
    grounding: true,
    config: { apiKey, model },
    timeoutMs: 30_000,
  });

  const g = r.grounding;
  console.log('--- Gemini grounding 실측 결과 ---');
  console.log('model:', r.model);
  console.log('grounding.used:', g?.used);
  console.log('grounding.queries:', JSON.stringify(g?.queries ?? []));
  console.log('grounding.sources 건수:', g?.sources?.length ?? 0);
  console.log('sources(호스트만):', JSON.stringify((g?.sources ?? []).map((s) => {
    try { return new URL(s.uri).host; } catch { return s.uri.slice(0, 40); }
  })));
  console.log('content(앞 200자):', r.content.slice(0, 200));

  if (g?.used && (g.sources?.length ?? 0) > 0) {
    console.log('\n[PASS] 실제 grounding 수행 + groundingMetadata/citation 확보.');
    process.exit(0);
  }
  console.error(
    '\n[FAIL] groundingMetadata/citation 이 응답에 없습니다 — grounded research 로 간주하지 않습니다.',
  );
  process.exit(1);
}

main().catch((e) => {
  console.error('[FAIL] 실측 호출 실패:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
