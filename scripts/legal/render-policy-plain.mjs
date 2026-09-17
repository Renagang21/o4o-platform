#!/usr/bin/env node
/**
 * 정책 문서 원문(markdown, docs/baseline/O4O-PRIVACY-POLICY-V1.0.md 등) → service_policy_documents.content 게시형(plain text).
 *
 * WO-O4O-PRIVACY-POLICY-V1-PUBLISH-AND-CROSSSERVICE-SMOKE
 *
 * 왜 변환하는가: 공개 뷰어가 두 종류다.
 *   - @o4o/shared-space-ui PolicyDocumentViewer (Neture · K-Cosmetics · PharmacyHub) = white-space: pre-wrap 순수 텍스트
 *   - KPA LegalDocumentView = line 기반 안전 markdown(#/##/###/- /N. 만 인식)
 *   markdown 을 그대로 넣으면 앞 셋에서 `##` · `**` · `[x](mailto:)` 가 그대로 노출된다.
 *   → 문장은 한 글자도 바꾸지 않고 서식 토큰만 제거한 plain 형으로 게시한다(두 뷰어 모두 정상 표시).
 *
 * 규칙(결정적):
 *   - 파일 상단 `> ` 헤더 블록(저장소 메타)은 제외 · 첫 `# 제목` 줄은 제외(title 컬럼이 담당)
 *   - `## ` / `### ` 접두 제거(제목 줄은 그대로 한 줄)
 *   - `**x**` → `x` · `[text](url)` → `text` · `---` 구분선 제거
 *   - `* ` 불릿 → `- ` · 들여쓴 하위 불릿 `   * ` → `  - `
 *   - 연속 빈 줄 2개 이상 → 1개
 *
 * 사용: node scripts/legal/render-policy-plain.mjs <원문.md> > out.txt
 * 검증: --verify 를 붙이면 원문/결과의 서식 토큰을 모두 벗긴 문자열이 같은지 확인한다(문장 무변경 보증).
 */
import { readFileSync } from 'node:fs';

export function renderPolicyPlain(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let titleDropped = false;
  for (let line of lines) {
    if (line.startsWith('> ')) continue; // 저장소 헤더 블록
    if (!titleDropped && /^# /.test(line)) { titleDropped = true; continue; }
    if (/^---\s*$/.test(line)) continue;
    line = line.replace(/^#{2,3} /, '');
    line = line.replace(/^(\s*)\* /, (_, sp) => (sp.length ? '  - ' : '- '));
    line = line.replace(/\*\*(.+?)\*\*/g, '$1');
    line = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** 서식 토큰을 전부 벗긴 비교용 문자열(공백 무시). */
export function bareText(s) {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => !l.startsWith('> ') && !/^---\s*$/.test(l))
    .join('\n')
    .replace(/^# .*\n/m, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*\-\s]/g, '');
}

const isMain = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop());
if (isMain) {
  const [, , file, flag] = process.argv;
  if (!file) { console.error('usage: render-policy-plain.mjs <file.md> [--verify]'); process.exit(2); }
  const md = readFileSync(file, 'utf8');
  const plain = renderPolicyPlain(md);
  if (flag === '--verify') {
    const ok = bareText(md) === bareText(plain);
    console.log(ok ? 'VERIFY OK: 문장 동일(서식 토큰만 제거)' : 'VERIFY FAIL');
    process.exit(ok ? 0 : 1);
  }
  process.stdout.write(plain);
}
