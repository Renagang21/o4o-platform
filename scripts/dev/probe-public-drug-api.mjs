#!/usr/bin/env node
// probe-public-drug-api.mjs
// 공공데이터포털(data.go.kr) 의약품 OpenAPI 응답 필드 실측용 개발 probe.
//
// 목적: WO-O4O-HOSPITAL-DRUG-BROWSER-ONLY-... 의 sequence 2단계
//       "실제 응답 필드 테스트" 를 인증키를 채팅/Git 에 노출하지 않고 수행한다.
//
// 안전 규칙:
//   - 인증키(serviceKey)는 환경변수 PUBLIC_DRUG_API_SERVICE_KEY 에서만 읽는다.
//   - 스크립트/출력/로그에 키 값을 절대 기록하지 않는다(URL 출력 시 마스킹).
//   - 이 파일은 dev 전용. 프로덕션 route/서버에 등록하지 않는다.
//
// 사용법 (사용자 로컬에서, 키는 본인 셸에만 설정):
//   PowerShell:
//     $env:PUBLIC_DRUG_API_SERVICE_KEY="<발급키>"
//     node scripts/dev/probe-public-drug-api.mjs "<엔드포인트URL>" 파라미터=값 ...
//   Git Bash:
//     PUBLIC_DRUG_API_SERVICE_KEY="<발급키>" node scripts/dev/probe-public-drug-api.mjs "<엔드포인트URL>" 파라미터=값 ...
//
// 예 (엔드포인트는 승인받으신 API 상세페이지의 요청주소를 그대로 사용):
//   node scripts/dev/probe-public-drug-api.mjs \
//     "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService06/getDrugPrdtPrmsnDtlInq05" \
//     item_name=타이레놀정500밀리그람 numOfRows=3
//
//   node scripts/dev/probe-public-drug-api.mjs \
//     "https://apis.data.go.kr/1471000/DrugBundlePrmsnInfoService01/getDrugBundlePrmsnList01" \
//     item_seq=195700020 numOfRows=10
//
// 요구사항: Node 18+ (전역 fetch).

const KEY_ENV = 'PUBLIC_DRUG_API_SERVICE_KEY';
const serviceKey = process.env[KEY_ENV];

function fail(msg) {
  console.error(`\n[probe] ${msg}\n`);
  process.exit(1);
}

if (!serviceKey) {
  fail(
    `환경변수 ${KEY_ENV} 가 없습니다. 인증키를 본인 셸에만 설정한 뒤 다시 실행하세요.\n` +
      `  PowerShell:  $env:${KEY_ENV}="<발급키>"\n` +
      `  Git Bash:    export ${KEY_ENV}="<발급키>"\n` +
      `(키 값은 이 스크립트/채팅/Git 에 넣지 마세요.)`,
  );
}

const [endpoint, ...rawParams] = process.argv.slice(2);
if (!endpoint) {
  fail('엔드포인트 URL 이 필요합니다. 승인받으신 API 상세페이지의 "요청주소"를 그대로 넣으세요.');
}

// key=value 형태 파라미터 파싱
const extra = {};
for (const p of rawParams) {
  const idx = p.indexOf('=');
  if (idx === -1) {
    fail(`파라미터는 key=value 형태여야 합니다: "${p}"`);
  }
  extra[p.slice(0, idx)] = p.slice(idx + 1);
}

function buildUrl({ asJson }) {
  const u = new URL(endpoint);
  // data.go.kr serviceKey 는 이미 인코딩된 값(encoded)일 수 있어 이중 인코딩을 피하려고
  // searchParams 대신 직접 조립한다. 우선 encoding 그대로 사용.
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  if (asJson) params.set('_type', 'json'); // 다수 식약처 API 가 _type=json 지원
  const base = u.origin + u.pathname;
  const qs = params.toString();
  // serviceKey 는 마지막에, 원문 그대로(추가 인코딩 없이) 붙인다.
  return `${base}?${qs}${qs ? '&' : ''}serviceKey=${serviceKey}`;
}

function maskUrl(url) {
  return url.replace(/serviceKey=[^&]+/i, 'serviceKey=***MASKED***');
}

function fieldNames(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj) : [];
}

// 응답 JSON 안에서 item 배열을 찾아본다(공공 API 표준: response.body.items.item)
function findItems(json) {
  const body = json?.response?.body ?? json?.body ?? json;
  const items = body?.items?.item ?? body?.items ?? body?.item;
  if (Array.isArray(items)) return items;
  if (items && typeof items === 'object') return [items];
  return null;
}

function xmlTag(text, tag) {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : undefined;
}

// XML 응답을 파싱해 성공/실패 판정 + item 필드명 추출.
function reportXml(text) {
  // 표준 공공API 헤더(<header><resultCode>..) 또는 인증오류 헤더(<cmmMsgHeader><returnReasonCode>..) 모두 대응.
  const resultCode = xmlTag(text, 'resultCode');
  const resultMsg = xmlTag(text, 'resultMsg');
  const returnReasonCode = xmlTag(text, 'returnReasonCode');
  const returnAuthMsg = xmlTag(text, 'returnAuthMsg') ?? xmlTag(text, 'errMsg');
  const totalCount = xmlTag(text, 'totalCount');

  if (returnReasonCode || returnAuthMsg) {
    console.log(
      `\n[probe] 인증/요청 오류 XML — returnReasonCode=${returnReasonCode ?? '?'} ${returnAuthMsg ?? ''}`,
    );
    console.log('        (SERVICE_KEY_IS_NOT_REGISTERED_ERROR / 인코딩키 여부 / 승인 상태 확인)');
    return;
  }

  const ok = resultCode === '00' || resultCode === undefined; // resultCode 없이 item 만 오는 API 도 있음
  console.log(
    `\n[probe] XML 응답 · resultCode=${resultCode ?? '(없음)'} resultMsg=${resultMsg ?? ''} totalCount=${totalCount ?? '?'} → ${ok ? '정상' : '실패'}`,
  );

  const first = text.match(/<item>([\s\S]*?)<\/item>/i);
  if (!first) {
    console.log('\n[probe] <item> 을 찾지 못했습니다. 응답 앞부분:');
    console.log('----------------------------------------------------------');
    console.log(text.slice(0, 2000));
    console.log('----------------------------------------------------------');
    return;
  }
  const inner = first[1];
  const fields = [...inner.matchAll(/<([A-Za-z0-9_]+)>/g)].map((m) => m[1]);
  const uniqueFields = [...new Set(fields)];
  console.log(`[probe] item 필드명(첫 레코드): ${uniqueFields.join(', ')}`);
  console.log('\n[probe] 첫 <item> 원문:');
  console.log('----------------------------------------------------------');
  console.log(first[0].slice(0, 3000));
  console.log('----------------------------------------------------------');
  console.log('\n[probe] 위 "필드명" 목록만 채팅에 붙여주시면 됩니다. (인증키는 절대 붙이지 마세요.)');
}

async function run() {
  // 1차: JSON 시도
  let url = buildUrl({ asJson: true });
  console.log(`\n[probe] GET ${maskUrl(url)}`);
  let res, text;
  try {
    res = await fetch(url);
    text = await res.text();
  } catch (e) {
    fail(`요청 실패: ${e.message}`);
  }
  console.log(`[probe] HTTP ${res.status} ${res.statusText}  (${text.length} bytes)`);

  const looksJson = text.trim().startsWith('{') || text.trim().startsWith('[');
  if (!looksJson) {
    // XML 응답을 1급으로 파싱한다(다수 식약처 API 는 XML 이 기본이고 _type=json 미지원).
    reportXml(text);
    return;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    fail(`JSON 파싱 실패: ${e.message}`);
  }

  const header = json?.response?.header ?? json?.header;
  if (header) console.log(`[probe] resultCode=${header.resultCode} resultMsg=${header.resultMsg}`);

  const items = findItems(json);
  if (!items || items.length === 0) {
    console.log('\n[probe] item 을 찾지 못했습니다. 응답 최상위 구조:');
    console.log(JSON.stringify(json, null, 2).slice(0, 2000));
    return;
  }

  console.log(`\n[probe] item 개수: ${items.length}`);
  console.log(`[probe] item 필드명(첫 레코드): ${fieldNames(items[0]).join(', ')}`);
  console.log('\n[probe] 첫 레코드 샘플:');
  console.log('----------------------------------------------------------');
  console.log(JSON.stringify(items[0], null, 2));
  console.log('----------------------------------------------------------');
  console.log(
    '\n[probe] 위 "필드명" 목록만 채팅에 붙여주시면 됩니다. (인증키는 절대 붙이지 마세요.)',
  );
}

run();
