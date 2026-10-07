#!/usr/bin/env node

/**
 * Docs Sensitive Info Guard
 *
 * WO-O4O-DOCS-SECURITY-SEPARATION-AND-INTAKE-RULES-V1
 *
 * ## 목적
 * 이 저장소는 Public 이다. `docs/**` 에 개인정보 · 접속 흔적이 다시 들어오는 것을 막는다.
 *
 * ## 검사 패턴
 * - personal_email : 개인 메일 도메인(gmail · naver · daum 등) 주소. 예시용 local part(example · test …) 는 허용
 * - phone_kr       : 010 휴대전화 번호. 예시값(1234-5678 · 0000-0000 · 1111-1111) 은 허용
 * - public_ip      : 공인 IPv4. 사설 · loopback · 문서 예시 대역(RFC 5737) · 공개 DNS 는 허용
 *
 * 메일은 모든 텍스트 파일, 전화 · IP 는 문서 형식(md · txt · yaml · csv)만 본다.
 * 데이터 JSON/HTML 의 조항 번호(`7.1.2.3` 형태) · UUID 조각이 숫자 패턴과 겹치기 때문이다.
 *
 * 검사하지 않는 것: 서비스계정 주소 · Cloud SQL 인스턴스 이름 — `.github/workflows` · `SETUP.md` 에 운영 설정으로
 * 이미 공개되어 있어 docs 에서만 막는 의미가 없다. 비밀번호 · 토큰은 별도 secret scanning 축이다.
 *
 * ## 대체 표기
 * 개인 메일 `[REDACTED_EMAIL]` · 전화 `[REDACTED_PHONE]` · IP `[REDACTED_IP]` (CLAUDE.md "DB · 보안 경계")
 *
 * ## 사용법
 *   node scripts/check-doc-sensitive.mjs          # git 추적 docs 전체 검사, 위반 시 exit 1
 *   node scripts/check-doc-sensitive.mjs a.md b.md # 지정 파일만 검사
 *
 * 출력에는 값을 싣지 않는다(파일 · 줄 · 범주만).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TEXT_EXT = /\.(md|txt|ya?ml|csv|json|html?)$/i;
const DOC_EXT = /\.(md|txt|ya?ml|csv)$/i;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@(?:gmail|naver|daum|hanmail|kakao|nate|hotmail|outlook|yahoo|icloud)\.(?:com|net|co\.kr)\b/gi;
const EMAIL_ALLOWED_LOCAL = /^(example|test|user|your|you|name|foo|bar|xxx+|abc|sample|someone)[0-9._-]*$/i;

const PHONE_RE = /(?<![\w.-])010[- .]?\d{3,4}[- .]?\d{4}(?![\w.-])/g;
const PHONE_ALLOWED_TAIL = new Set(['12345678', '00000000', '11111111', '1234567', '0000000']);

const IP_RE = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g;
const IP_ALLOWED = new Set(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '168.126.63.1', '168.126.63.2', '0.0.0.0', '255.255.255.255']);

function isPublicIp(ip) {
  const o = ip.split('.').map(Number);
  if (o.some((n) => n > 255)) return false;
  if (IP_ALLOWED.has(ip)) return false;
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return false;
  return true;
}

/**
 * 위반 목록 [{category, value, index}] — value 는 마스킹 도구용이며 출력하지 않는다.
 * emailOnly: 데이터 파일(JSON · HTML)은 메일만 본다.
 */
export function findSensitive(text, { emailOnly = false } = {}) {
  const hits = [];
  for (const m of text.matchAll(EMAIL_RE)) {
    if (!EMAIL_ALLOWED_LOCAL.test(m[0].split('@')[0])) hits.push({ category: 'personal_email', value: m[0], index: m.index });
  }
  if (emailOnly) return hits;
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (!PHONE_ALLOWED_TAIL.has(digits.slice(3))) hits.push({ category: 'phone_kr', value: m[0], index: m.index });
  }
  for (const m of text.matchAll(IP_RE)) {
    if (isPublicIp(m[0])) hits.push({ category: 'public_ip', value: m[0], index: m.index });
  }
  return hits;
}

export function listDocFiles() {
  return execFileSync('git', ['-c', 'core.quotepath=off', 'ls-files', '-z', 'docs'], { encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\0')
    .filter((f) => f && TEXT_EXT.test(f));
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args.filter((f) => TEXT_EXT.test(f)) : listDocFiles();
  let total = 0;
  for (const file of files) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    for (const h of findSensitive(text, { emailOnly: !DOC_EXT.test(file) })) {
      const line = text.slice(0, h.index).split('\n').length;
      console.log(`${file}:${line}: ${h.category}`);
      total++;
    }
  }
  if (total) {
    console.error(`\n❌ docs 민감정보 패턴 ${total}건 — Public 저장소다. [REDACTED_EMAIL] · [REDACTED_PHONE] · [REDACTED_IP] 로 바꾼다.`);
    process.exit(1);
  }
  console.log(`✅ docs 민감정보 패턴 0건 (${files.length} files)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
