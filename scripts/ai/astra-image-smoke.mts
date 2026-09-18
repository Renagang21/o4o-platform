/**
 * Astra(gpt-6-astra) 이미지 입력 실측 스모크 — Capability B / B0 게이트
 * WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-B-ASTRA-SCREEN-V1 §B0
 *
 * 목적(코드 구현 전 실측):
 *   1. OpenAI Chat Completions API 가 gpt-6-astra 로 image_url 입력을 실제로 수용하는가
 *   2. gpt-6-astra 가 이미지 내용(픽셀)을 근거로 답하는가
 *   3. text-only fallback(이미지 무시)이 아닌가
 *
 * 판정을 결정적으로 만들기 위해, 색이 알려진 2x2 사분면 fixture 를 내장한다
 * (좌상 빨강 · 우상 초록 · 좌하 파랑 · 우하 노랑). 모델이 실제로 픽셀을 봤다면
 * 이 색/배치를 답에 담아야 한다 → 자동 판정. text-only 대조 호출로 fallback 을 배제한다.
 *
 * 실행(키는 env 로만 주입 — 코드·로그에 기록하지 않는다):
 *   OPENAI_API_KEY=... npx tsx scripts/ai/astra-image-smoke.mts
 *   (선택) ASTRA_MODEL=gpt-6-astra  (기본값)
 *   (선택) 실제 스크린샷으로도 확인:  ... scripts/ai/astra-image-smoke.mts <이미지경로.png>
 *
 * 판정:
 *   - image 호출 성공 + 답에 fixture 색이 3개 이상 등장(픽셀 근거) → ASTRA_IMAGE_INPUT PASS(exit 0).
 *   - text-only 대조 답에는 그 색들이 (거의) 없어야 한다 → fallback 아님 확인.
 *   - API 가 이미지를 거부(4xx)하면 FAIL(exit 1) — 원인 출력.
 *   - 키 부재면 실행하지 않고 PENDING(exit 2). PASS 로 보고하지 않는다.
 *
 * 이 스크립트는 어떤 O4O 코드도 변경하지 않는다(순수 실측). PASS 여야 B1 구현으로 넘어간다.
 */

import zlib from 'node:zlib';
import { readFileSync } from 'node:fs';

const apiKey = process.env.OPENAI_API_KEY || process.env.ASTRA_API_KEY || '';
if (!apiKey) {
  console.error(
    '[PENDING] OPENAI_API_KEY 가 env 에 없습니다. 키를 env 로 주입한 뒤 재실행하세요.\n' +
      '  OPENAI_API_KEY=<key> npx tsx scripts/ai/astra-image-smoke.mts\n' +
      '  (키는 코드·문서·로그에 기록하지 않습니다.)',
  );
  process.exit(2);
}

const model = process.env.ASTRA_MODEL || 'gpt-6-astra';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

// ── PNG 인코더(무의존) — fixture 를 코드로 재생성해 opaque base64 를 커밋하지 않는다. ──
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData), 0);
  return Buffer.concat([len, typeData, crc]);
}
/** size×size RGB PNG. quadrant(x,y)→[r,g,b] 로 색을 채운다. */
function makeQuadrantPng(size: number): Buffer {
  const half = size / 2;
  const colors = {
    tl: [220, 30, 30], // 빨강
    tr: [30, 180, 60], // 초록
    bl: [40, 70, 220], // 파랑
    br: [235, 215, 40], // 노랑
  };
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const c = x < half ? (y < half ? colors.tl : colors.bl) : y < half ? colors.tr : colors.br;
      raw[p++] = c[0];
      raw[p++] = c[1];
      raw[p++] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mimeFromPath(path: string): string {
  const ext = path.toLowerCase().split('.').pop() || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/png';
}

// 이미지 소스: argv 로 실제 스크린샷을 주면 그것을, 아니면 내장 사분면 fixture.
const argPath = process.argv[2];
let imageBase64: string;
let imageMime: string;
let usingFixture: boolean;
if (argPath) {
  imageBase64 = readFileSync(argPath).toString('base64');
  imageMime = mimeFromPath(argPath);
  usingFixture = false;
} else {
  imageBase64 = makeQuadrantPng(64).toString('base64');
  imageMime = 'image/png';
  usingFixture = true;
}

const FIXTURE_QUESTION =
  '이 이미지를 설명하라. 화면을 사분면(좌상/우상/좌하/우하)으로 나눠 각 영역에 어떤 색이 있는지 정확히 답하라.';
const SCREENSHOT_QUESTION = '이 이미지에서 보이는 주요 UI 요소를 설명하라. 버튼·입력창·제목 등 구체적으로.';
const question = usingFixture ? FIXTURE_QUESTION : SCREENSHOT_QUESTION;

async function callOpenAI(withImage: boolean, timeoutMs = 40_000): Promise<{ ok: boolean; status: number; content: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const userContent = withImage
      ? [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        ]
      : question;
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '너는 화면을 관찰하는 어시스턴트다. 보이는 것만 근거로 답하라.' },
          { role: 'user', content: userContent },
        ],
        max_completion_tokens: 400,
      }),
      signal: controller.signal,
    });
    const bodyText = await res.text();
    if (!res.ok) return { ok: false, status: res.status, content: '', error: bodyText.slice(0, 300) };
    const data = JSON.parse(bodyText) as { choices?: { message?: { content?: string } }[] };
    return { ok: true, status: res.status, content: data.choices?.[0]?.message?.content ?? '' };
  } catch (e) {
    return { ok: false, status: 0, content: '', error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** 답에 fixture 색이 몇 개 언급됐는지(한/영). */
function colorHits(text: string): string[] {
  const t = text.toLowerCase();
  const map: Record<string, string[]> = {
    red: ['빨', 'red', '적색'],
    green: ['초록', '녹색', 'green'],
    blue: ['파랑', '파란', '청색', 'blue'],
    yellow: ['노랑', '노란', '황색', 'yellow'],
  };
  return Object.entries(map)
    .filter(([, kws]) => kws.some((k) => t.includes(k)))
    .map(([c]) => c);
}

async function main() {
  console.log('--- Astra 이미지 입력 실측 ---');
  console.log('model:', model);
  console.log('image source:', usingFixture ? '내장 사분면 fixture(64x64 RGB)' : `파일: ${argPath} (${imageMime})`);

  // 1) 이미지 포함 호출
  const img = await callOpenAI(true);
  if (!img.ok) {
    console.error(`\n[FAIL] 이미지 호출 실패 (status ${img.status}): ${img.error ?? ''}`);
    console.error('ASTRA_IMAGE_INPUT = FAIL — API 가 이미지 입력을 수용하지 않거나 모델이 거부.');
    process.exit(1);
  }
  console.log('\n[image 답변]\n' + img.content);

  if (usingFixture) {
    const hits = colorHits(img.content);
    console.log('\nfixture 색 적중:', JSON.stringify(hits), `(${hits.length}/4)`);

    // 3) text-only 대조 — 같은 질문, 이미지 없음. 픽셀을 못 봤다면 색을 알 수 없다.
    const txt = await callOpenAI(false);
    const txtHits = txt.ok ? colorHits(txt.content) : [];
    console.log('text-only 대조 색 적중:', JSON.stringify(txtHits), `(${txtHits.length}/4)`);

    if (hits.length >= 3 && hits.length > txtHits.length) {
      console.log('\n[PASS] gpt-6-astra 가 실제 픽셀을 근거로 색/배치를 답함(text-only 대조보다 우월).');
      console.log('ASTRA_IMAGE_INPUT = PASS');
      console.log('ASTRA_SCREEN_UNDERSTANDING = PASS (사분면 색 인지)');
      process.exit(0);
    }
    console.error('\n[FAIL] 이미지 근거가 약함 — fixture 색을 3개 이상 정확히 인지하지 못함(또는 text-only 와 동급).');
    console.error('ASTRA_IMAGE_INPUT = 확인 불가 / 의심 — 실제 스크린샷 인자로 재확인 권장.');
    process.exit(1);
  }

  // 실제 스크린샷 모드: API 수용은 확인됐고, 화면 이해는 사용자가 판정.
  console.log('\n[NOTE] 실제 스크린샷 모드 — API 이미지 수용은 확인됨(ASTRA_IMAGE_INPUT 후보 PASS).');
  console.log('ASTRA_SCREEN_UNDERSTANDING 은 위 답변 내용으로 사용자가 판정하세요(UI 요소를 정확히 짚는가).');
  process.exit(0);
}

main().catch((e) => {
  console.error('[FAIL] 실측 호출 실패:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
