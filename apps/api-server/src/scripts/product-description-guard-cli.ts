/**
 * Product Description Grounding Guard — CLI
 *
 * WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1 §19
 *
 *   pnpm guard:product-description -- --phase post --input <dir|file> --output <file>
 *
 * 옵션:
 *   --phase pre|post|bilingual|all   (기본 all)
 *   --category hff|drug|...          (입력 필터)
 *   --input <path>                   .json 파일 또는 *.json 이 든 디렉터리
 *   --output <path>                  결과 저장(미지정 시 stdout 요약만)
 *   --format json|markdown           (기본 json)
 *   --strict                         REVIEW_REQUIRED 도 실패로
 *
 * exit code: 0 PASS / 1 REVIEW_REQUIRED / 2 BLOCKED / 3 실행 오류
 *
 * ⚠️ 이 CLI 는 **읽기 전용**이다. DB 접근 0, 초안 수정 0, 자동 보완 0 (WO §20·§27).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { runGuardBatch, exitCodeFor } from '../modules/content-guard/product-description-guard.js';
import type { GuardProductInput, GuardBatchResult, GuardPhase } from '../modules/content-guard/product-description-guard.types.js';

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function loadInputs(path: string): GuardProductInput[] {
  const st = statSync(path);
  const files = st.isDirectory()
    ? readdirSync(path).filter((f) => extname(f) === '.json').map((f) => join(path, f))
    : [path];
  const out: GuardProductInput[] = [];
  for (const f of files) {
    const parsed = JSON.parse(readFileSync(f, 'utf8'));
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of arr) {
      validate(item, f);
      out.push(item as GuardProductInput);
    }
  }
  return out;
}

/** 최소 스키마 검증 — 잘못된 입력은 조용히 통과시키지 않는다(미탐 방지). */
function validate(x: unknown, file: string): void {
  const o = x as Record<string, unknown>;
  const need = ['candidateId', 'productName', 'source', 'grounding', 'drafts'];
  for (const k of need) {
    if (o?.[k] === undefined) throw new Error(`[${file}] 필수 필드 누락: ${k}`);
  }
  const src = o.source as Record<string, unknown>;
  for (const k of ['mainFunction', 'baseStandard', 'intake', 'caution', 'dosageForm']) {
    if (typeof src?.[k] !== 'string') throw new Error(`[${file}] source.${k} 는 string 이어야 합니다`);
  }
  const d = o.drafts as Record<string, unknown>;
  if (typeof d?.ko !== 'string' || typeof d?.en !== 'string')
    throw new Error(`[${file}] drafts.ko / drafts.en 는 string 이어야 합니다`);
}

function toMarkdown(b: GuardBatchResult): string {
  const L: string[] = [];
  L.push(`# Product Description Guard Result`, '', `- guard: \`${b.guardVersion}\``,
    `- 제품 ${b.totalProducts} · PASS ${b.pass} · REVIEW_REQUIRED ${b.reviewRequired} · **BLOCKED ${b.blocked}**`, '');
  L.push('## 규칙별 검출', '', '| ruleId | 건수 |', '|---|---:|');
  for (const [k, v] of Object.entries(b.findingsByRule).sort((a, z) => z[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push('', '## 제품별', '', '| 제품 | pre | post | ko/en | 종합 | BLOCKED | REVIEW |', '|---|---|---|---|---|---:|---:|');
  for (const p of b.products)
    L.push(`| ${p.productName} | ${p.preGuardStatus} | ${p.postGuardStatus} | ${p.koEnStatus} | **${p.overallStatus}** | ${p.blockedCount} | ${p.reviewCount} |`);
  const bad = b.products.flatMap((p) => p.findings.filter((f) => f.status === 'BLOCKED' || f.status === 'REVIEW_REQUIRED').map((f) => ({ p, f })));
  if (bad.length) {
    L.push('', '## 검출 상세', '');
    for (const { p, f } of bad) {
      L.push(`### ${f.status} · ${f.ruleId} — ${p.productName}`, '',
        `- lang: ${f.language} / field: ${f.field}`,
        f.matchedText ? `- matched: \`${f.matchedText}\`` : '- matched: (없음)',
        f.sourceEvidence ? `- evidence: ${f.sourceEvidence}` : '',
        `- ${f.message}`, `- → ${f.suggestedAction}`, '');
    }
  }
  return L.join('\n');
}

function main(): number {
  const input = arg('input');
  if (!input) {
    console.error('사용: --input <dir|file.json> [--output <file>] [--phase pre|post|bilingual|all] [--format json|markdown] [--strict]');
    return 3;
  }
  const phase = (arg('phase', 'all') as GuardPhase | 'all');
  const category = arg('category');
  const format = arg('format', 'json');
  const strict = flag('strict');

  let inputs = loadInputs(input);
  if (category) inputs = inputs.filter((i) => (i.category ?? '') === category);
  if (inputs.length === 0) {
    console.error(`입력이 비었습니다 (input=${input}${category ? `, category=${category}` : ''})`);
    return 3;
  }

  const batch = runGuardBatch(inputs, { phase, strict });
  const out = arg('output');
  if (out) {
    writeFileSync(out, format === 'markdown' ? toMarkdown(batch) : JSON.stringify(batch, null, 2), 'utf8');
  }

  console.log(`guard=${batch.guardVersion} phase=${phase}`);
  console.log(`제품 ${batch.totalProducts} · PASS ${batch.pass} · REVIEW_REQUIRED ${batch.reviewRequired} · BLOCKED ${batch.blocked}`);
  for (const p of batch.products) {
    if (p.overallStatus === 'PASS') continue;
    console.log(`  [${p.overallStatus}] ${p.productName} — blocked ${p.blockedCount} / review ${p.reviewCount}`);
    for (const f of p.findings.filter((x) => x.status === 'BLOCKED')) {
      console.log(`      ✗ ${f.ruleId} (${f.language}) ${f.matchedText ?? ''} — ${f.message}`);
    }
  }
  if (out) console.log(`결과: ${out}`);
  return exitCodeFor(batch, strict);
}

try {
  process.exit(main());
} catch (e) {
  console.error(`실행 오류: ${(e as Error).message}`);
  process.exit(3);
}
