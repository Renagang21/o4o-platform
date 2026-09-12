/**
 * WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0 — §52 Core test gates
 *
 *  1 site registry · 2 alias resolution · 3 canonical origin · 4 unknown site reject · 5 entryPoint registry
 *  6 intent resolution · 7 ambiguous intent · 8 disabled entryPoint · 9 usage event · 10 raw query not logged
 *
 * 코어는 사이트를 모른다 — 별칭 · intent · usage 규칙은 등재부 데이터로만 동작한다(§4). 실행은 healthkr-adapter.spec 가 본다.
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { BROWSER_SITE_IDS, BROWSER_SITE_REGISTRY } from '../services/local-agent/browser-site-registry.js';
import { LOCAL_AGENT_ACTION_ALLOWLIST, composeSiteAction } from '../services/local-agent/local-agent-protocol.js';
import {
  PHARMACY_WEB_ENTRYPOINT_IDS,
  PHARMACY_WEB_ENTRYPOINT_REGISTRY,
  PHARMACY_WEB_ERROR,
  PHARMACY_WEB_INTENT,
  PHARMACY_WEB_SITE_IDS,
  PHARMACY_WEB_USAGE_KEYS,
  buildPharmacyWebUsageEvent,
  findPharmacyWebEntryPoint,
  findPharmacyWebSite,
  findPharmacyWebViolations,
  isEnabledPharmacyWebEntryPoint,
  isRegisteredPharmacyWebSite,
  isRobotsDisallowedPath,
  isValidPharmacyWebQuery,
  parsePillConditions,
  pharmacyWebErrorFromDom,
  pharmacyWebSiteDisplayName,
  resolvePharmacyWebEntryPoint,
  resolvePharmacyWebIntent,
  resolvePharmacyWebSite,
  validatePharmacyWebEntryArgs,
  validatePillIdentificationInput,
} from '../services/local-agent/pharmacy-web-core.js';
import { AI_TOOL_NAMES, AI_TOOL_REGISTRY, findAutomationInvariantViolations, findToolDefinition, validateToolArguments, type VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import {
  detectPharmacyWebInvocation,
  extractDrugNameToken,
  needsLocalDeviceResolution,
  pharmacyWebRequestGap,
  selectToolInvocationForRequest,
} from '../services/ai-tools/ai-tool-router.js';
import { buildHomeChatSystemPrompt } from '../services/ai-prompts/homeChat.js';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const read = (p: string) => readFileSync(p, 'utf8');
const SITE = 'healthkr';
const TOOL = AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT;
const ctx = (over: Partial<VerifiedToolContext> = {}): VerifiedToolContext => ({
  userId: 'user-1',
  workspace: 'home',
  localAgentStatus: 'connected',
  localDeviceId: 'dev-1',
  ...over,
});

describe('1. site registry (§5·§7)', () => {
  it('약학정보원 1곳 · 등재 browser site 위에 있고 정합성 위반 0 · disabled 아님', () => {
    expect(PHARMACY_WEB_SITE_IDS).toEqual([SITE]);
    const s = findPharmacyWebSite(SITE)!;
    expect(s).toMatchObject({ displayName: '약학정보원', canonicalOrigin: 'https://health.kr', loginRequired: false, adapterId: 'healthkr', enabled: true });
    expect(findPharmacyWebViolations()).toEqual([]);
    expect(isRegisteredPharmacyWebSite(SITE)).toBe(true);
    expect(isRegisteredPharmacyWebSite('evil.site')).toBe(false);
    expect(pharmacyWebSiteDisplayName('evil.site')).toBe('해당 사이트');
    // 등재는 browser site 3 사본과 allowlist 로 이어진다 — 새 agent action 종류는 없다(siteId 당 10항목).
    expect(BROWSER_SITE_IDS).toContain(SITE);
    const forSite = LOCAL_AGENT_ACTION_ALLOWLIST.filter((a) => a.endsWith(`#${SITE}`));
    expect(forSite).toHaveLength(10);
    expect(forSite).toContain(composeSiteAction('local.browser.dom.read_table', SITE));
    for (const copy of ['tools/o4o-local-agent/src/browser-site-registry.mjs', 'tools/o4o-chrome-extension/src/site-registry.js', 'tools/o4o-chrome-extension/src/content-script.js']) {
      expect(read(join(REPO_ROOT, copy))).toContain("'https://health.kr'");
    }
    const manifest = JSON.parse(read(join(REPO_ROOT, 'tools', 'o4o-chrome-extension', 'manifest.json')));
    expect(manifest.host_permissions).toContain('https://health.kr/*');
    expect(manifest.content_scripts[0].matches).toContain('https://health.kr/*');
  });

  it('tool 은 하나(local.pharmacyweb.entrypoint) — browser_dom · REVERSIBLE · DOM 상호작용 자격 재사용 · 불변식 위반 0', () => {
    const t = findToolDefinition(TOOL)!;
    expect(AI_TOOL_REGISTRY.filter((x) => x.name.startsWith('local.pharmacyweb.')).map((x) => x.name)).toEqual([TOOL]);
    expect(t).toMatchObject({ automationMethod: 'browser_dom', riskLevel: 'REVERSIBLE', readOnly: false, effect: 'BROWSER_DOM_INTERACTION', executionMode: 'local' });
    expect(t.requiredCapabilities).toEqual(['LOCAL_BROWSER_DOM_INTERACT']);
    expect(findAutomationInvariantViolations()).toEqual([]);
  });
});

describe('2. alias resolution (§6)', () => {
  it('약학정보원 · 약정원 · health.kr · 약학 정보원 → healthkr; 미등재 이름 · 빈 문장 → null', () => {
    for (const m of ['약학정보원에서 찾아줘', '약정원 열어줘', 'health.kr 에서', '약학 정보원', 'HEALTH.KR']) expect(resolvePharmacyWebSite(m)).toBe(SITE);
    expect(resolvePharmacyWebSite('대한약사회에서 찾아줘')).toBeNull();
    expect(resolvePharmacyWebSite('')).toBeNull();
    // 사이트 축(열기/상태)도 같은 별칭으로 동작한다 — URL 을 묻지 않는다.
    expect(selectToolInvocationForRequest('약학정보원 열어줘', ctx())).toEqual({ tool: AI_TOOL_NAMES.BROWSER_OPEN_SITE, args: { siteId: SITE } });
    expect(needsLocalDeviceResolution('약정원 열려 있어?')).toBe(true);
  });
});

describe('3. canonical origin (§5·§43)', () => {
  it('canonicalOrigin 은 browser site allowedOrigins 와 같고 https · 경로 없음; 위반은 잡힌다', () => {
    const s = findPharmacyWebSite(SITE)!;
    const b = BROWSER_SITE_REGISTRY.find((x) => x.siteId === SITE)!;
    expect(b.allowedOrigins).toEqual([s.canonicalOrigin]);
    expect(b.url).toBe('https://health.kr/');
    expect(s.canonicalOrigin).toMatch(/^https:\/\/[^/]+$/);
    // robots Disallow 경로 — Adapter 가 가지 않는 경로. entryPath 는 이 경로가 아니다.
    expect(isRobotsDisallowedPath(SITE, '/searchDrug/result_sunb.asp?drug_cd=X')).toBe(true);
    expect(isRobotsDisallowedPath(SITE, '/searchDrug/search_DUR.asp')).toBe(true);
    expect(isRobotsDisallowedPath(SITE, '/searchDrug/ajax/x')).toBe(true);
    expect(isRobotsDisallowedPath(SITE, '/searchDrug/search_total_result.asp')).toBe(false);
    for (const ep of PHARMACY_WEB_ENTRYPOINT_REGISTRY) expect(isRobotsDisallowedPath(ep.siteId, ep.entryPath ?? '/')).toBe(false);
  });
});

describe('4. unknown site reject (§7·§47)', () => {
  it('미등재 사이트 이름으로는 tool 이 선택되지 않고, 미등재 entryPointId 는 인자 검증에서 끝난다', () => {
    expect(selectToolInvocationForRequest('대한약사회에서 "아모디핀정" 찾아줘', ctx())).toBeNull();
    expect(detectPharmacyWebInvocation('대한약사회에서 "아모디핀정" 찾아줘')).toBeNull();
    const tool = findToolDefinition(TOOL);
    expect(validateToolArguments({ entryPointId: 'kpa.drug_search', input: { query: 'x' } }, tool).ok).toBe(false);
    expect(validateToolArguments({ entryPointId: 'healthkr.drug_search', input: { query: 'x' }, url: 'https://evil' }, tool).ok).toBe(false);
    expect(validateToolArguments({ entryPointId: 'healthkr.drug_search', input: { query: 'x', selector: '#q' } }, tool).ok).toBe(false);
    expect(pharmacyWebErrorFromDom('DOM_CROSS_ORIGIN_BLOCKED')).toBe(PHARMACY_WEB_ERROR.CROSS_ORIGIN);
    expect(pharmacyWebErrorFromDom('DOM_USER_ACTION_REQUIRED')).toBe(PHARMACY_WEB_ERROR.USER_ACTION_REQUIRED);
    expect(pharmacyWebErrorFromDom('O4O_EXTENSION_NOT_CONNECTED')).toBe(PHARMACY_WEB_ERROR.SITE_NOT_READY);
  });
});

describe('5. entryPoint registry (§8·§9·§40·§41)', () => {
  it('약학정보원 EntryPoint 4개 · id 는 <siteId>.<intent> · navigationStrategy 는 이동 명령이 아닌 링크/현재 페이지', () => {
    expect(PHARMACY_WEB_ENTRYPOINT_IDS).toEqual(['healthkr.drug_search', 'healthkr.same_ingredient', 'healthkr.pill_identification', 'healthkr.drug_detail']);
    const pill = findPharmacyWebEntryPoint('healthkr.pill_identification')!;
    expect(pill).toMatchObject({ navigationStrategy: 'header_link', entryLinkText: '식별검색', entryPath: '/searchIdentity/search.asp', riskLevel: 'REVERSIBLE', enabled: true });
    expect(findPharmacyWebEntryPoint('healthkr.drug_detail')!.navigationStrategy).toBe('current_page');
    // hard-coded URL 칸이 없다 — entryPath 는 pathname 접두사뿐.
    for (const ep of PHARMACY_WEB_ENTRYPOINT_REGISTRY) {
      expect(ep.entryPath ?? '/').toMatch(/^\//);
      expect(JSON.stringify(ep)).not.toMatch(/https?:/);
    }
    expect(resolvePharmacyWebEntryPoint(SITE, PHARMACY_WEB_INTENT.SAME_INGREDIENT)!.entryPointId).toBe('healthkr.same_ingredient');
  });
});

describe('6. intent resolution (§11·§12)', () => {
  it('자연어 → intent → EntryPoint + 입력(§11 예시)', () => {
    expect(resolvePharmacyWebIntent('이 알약 뭐야?').intent).toBe(PHARMACY_WEB_INTENT.PILL_IDENTIFICATION);
    expect(resolvePharmacyWebIntent('같은 성분 제품 찾아줘').intent).toBe(PHARMACY_WEB_INTENT.SAME_INGREDIENT);
    expect(resolvePharmacyWebIntent('이 약 설명서 보여줘').intent).toBe(PHARMACY_WEB_INTENT.DRUG_DETAIL);
    expect(resolvePharmacyWebIntent('아모디핀정 찾아줘').intent).toBe(PHARMACY_WEB_INTENT.DRUG_SEARCH);
    expect(resolvePharmacyWebIntent('안녕')).toEqual({});

    expect(selectToolInvocationForRequest('약학정보원에서 "아모디핀정" 찾아줘', ctx())).toEqual({ tool: TOOL, args: { entryPointId: 'healthkr.drug_search', input: { query: '아모디핀정' } } });
    expect(selectToolInvocationForRequest('약정원에서 아모디핀정5mg 검색해줘', ctx())).toEqual({ tool: TOOL, args: { entryPointId: 'healthkr.drug_search', input: { query: '아모디핀정5mg' } } });
    expect(selectToolInvocationForRequest('아모디핀정과 동일성분 찾아줘', ctx())).toEqual({ tool: TOOL, args: { entryPointId: 'healthkr.same_ingredient', input: { query: '아모디핀정' } } });
    expect(selectToolInvocationForRequest('흰색 원형이고 앞에 HMP, 뒤에 AM 이라고 적힌 알약 뭐야?', ctx())).toEqual({
      tool: TOOL,
      args: { entryPointId: 'healthkr.pill_identification', input: { frontMark: 'HMP', backMark: 'AM', color: '흰색', shape: '원형', dosageForm: '정제' } },
    });
    expect(selectToolInvocationForRequest('이 약 설명서 보여줘', ctx())).toEqual({ tool: TOOL, args: { entryPointId: 'healthkr.drug_detail', input: {} } });
    // 일반 검색은 사이트 이름 없이는 이 축이 아니다(공급처 · 다른 축과 충돌 방지).
    expect(detectPharmacyWebInvocation('"아모디핀정" 찾아줘')).toBeNull();
    // 제품명 토큰 — 어미 표 · 조사 제거 · 둘 이상이면 단정하지 않는다.
    expect(extractDrugNameToken('약정원에서 아모디핀정을 찾아줘')).toBe('아모디핀정');
    expect(extractDrugNameToken('타이레놀정500mg 설명서')).toBe('타이레놀정500mg');
    expect(extractDrugNameToken('아모디핀정이랑 노바스크정 비교')).toBeNull();
    expect(needsLocalDeviceResolution('이 알약 뭐야? 앞에 HMP')).toBe(true);
    // 창 축과 동시에 걸리면 고르지 않는다.
    expect(selectToolInvocationForRequest('메모장이랑 약학정보원에서 "아모디핀정" 찾아줘', ctx())).toBeNull();
    // 로그인 요청은 이 축이 아니다 — 열기 축이 안내한다.
    expect(selectToolInvocationForRequest('약학정보원 로그인해서 "아모디핀정" 찾아줘', ctx())?.tool).toBe(AI_TOOL_NAMES.BROWSER_OPEN_SITE);
  });

  it('낱알 조건 구조화(§29) · 입력 형상 검증(§28)', () => {
    expect(parsePillConditions('흰색 원형이고 앞에 ABC, 뒤에 10이라고 적힌 알약')).toEqual({ frontMark: 'ABC', backMark: '10', color: '흰색', shape: '원형', dosageForm: '정제' });
    expect(parsePillConditions('앞면: HMP 뒷면: AM 5 노란 캡슐')).toEqual({ frontMark: 'HMP', backMark: 'AM 5', dosageForm: '캡슐' });
    expect(parsePillConditions('각인 XYZ 분할선 없음')).toEqual({ frontMark: 'XYZ', line: '없음' });
    expect(parsePillConditions('그냥 알약')).toEqual({ dosageForm: '정제' });
    expect(validatePillIdentificationInput({ frontMark: 'HMP' }).ok).toBe(true);
    expect(validatePillIdentificationInput({ color: '흰색' }).ok).toBe(false); // 식별문자 없음 — V0 DOM 적용 불가
    expect(validatePillIdentificationInput({ frontMark: '<b>' }).ok).toBe(false);
    expect(validatePillIdentificationInput({ frontMark: 'A', selector: '#x' }).ok).toBe(false);
    expect(isValidPharmacyWebQuery('아모디핀정')).toBe(true);
    expect(isValidPharmacyWebQuery('<script>')).toBe(false);
    expect(isValidPharmacyWebQuery('a'.repeat(101))).toBe(false);
    expect(validatePharmacyWebEntryArgs({ entryPointId: 'healthkr.pill_identification', input: { frontMark: 'HMP', backMark: 'AM' } }).ok).toBe(true);
    expect(validatePharmacyWebEntryArgs({ entryPointId: 'healthkr.drug_detail', input: {} }).ok).toBe(true);
    expect(validatePharmacyWebEntryArgs({ entryPointId: 'healthkr.drug_detail', input: { query: 'x' } }).ok).toBe(false);
  });
});

describe('7. ambiguous intent (§13)', () => {
  it('구체 업무 둘 이상 → ambiguous · tool 미선택 · gap 으로 되묻는다; 입력 없음도 gap', () => {
    const r = resolvePharmacyWebIntent('약학정보원에서 이 약 설명서 보여주고 동일성분도 찾아줘');
    expect(r.ambiguous).toBe(true);
    expect(r.candidates).toEqual([PHARMACY_WEB_INTENT.SAME_INGREDIENT, PHARMACY_WEB_INTENT.DRUG_DETAIL]);
    expect(selectToolInvocationForRequest('약학정보원에서 이 약 설명서 보여주고 동일성분도 찾아줘', ctx())).toBeNull();
    expect(pharmacyWebRequestGap('약학정보원에서 이 약 설명서 보여주고 동일성분도 찾아줘')).toBe('PHARMACY_WEB_INTENT_AMBIGUOUS');
    expect(pharmacyWebRequestGap('약학정보원에서 찾아줘')).toBe('PHARMACY_WEB_INPUT_MISSING');
    expect(pharmacyWebRequestGap('이 알약 뭐야?')).toBe('PHARMACY_WEB_INPUT_MISSING');
    expect(pharmacyWebRequestGap('약학정보원에서 "<script>" 찾아줘')).toBe('PHARMACY_WEB_INPUT_DENIED');
    expect(pharmacyWebRequestGap('네뚜레 열어줘')).toBeNull();
    expect(pharmacyWebRequestGap('약학정보원 열어줘')).toBeNull(); // intent 없음 → 열기 축
    const prompt = buildHomeChatSystemPrompt({ workspace: 'home', capabilities: [], pharmacyWebRequestGap: 'PHARMACY_WEB_INTENT_AMBIGUOUS' } as any);
    expect(prompt).toContain('골라 달라고');
    expect(buildHomeChatSystemPrompt({ workspace: 'home', capabilities: [], pharmacyWebAction: 'read' } as any)).toContain('검색 결과 후보');
  });
});

describe('8. disabled entryPoint (§8)', () => {
  it('enabled=false 인 EntryPoint 는 해석 · 인자 검증 · 실행 후보에서 빠진다 (등재부는 frozen — 복사본으로 검증)', () => {
    const disabled = PHARMACY_WEB_ENTRYPOINT_REGISTRY.map((e) => (e.entryPointId === 'healthkr.drug_search' ? { ...e, enabled: false } : e));
    expect(isEnabledPharmacyWebEntryPoint('healthkr.drug_search')).toBe(true);
    expect(isEnabledPharmacyWebEntryPoint('healthkr.drug_search', disabled)).toBe(false);
    expect(resolvePharmacyWebEntryPoint(SITE, PHARMACY_WEB_INTENT.DRUG_SEARCH, disabled)).toBeUndefined();
    expect(validatePharmacyWebEntryArgs({ entryPointId: 'healthkr.drug_search', input: { query: 'x' } }, disabled).ok).toBe(false);
    expect(validatePharmacyWebEntryArgs({ entryPointId: 'healthkr.same_ingredient', input: { query: 'x' } }, disabled).ok).toBe(true);
    expect(isEnabledPharmacyWebEntryPoint('healthkr.nope')).toBe(false);
    expect(Object.isFrozen(PHARMACY_WEB_ENTRYPOINT_REGISTRY[0])).toBe(true);
  });
});

describe('9·10. usage event · raw query not logged (§14·§15)', () => {
  it('usage event 는 허용 키 8개뿐 — 검색어 · 약 이름 · 환자정보 칸이 없다', () => {
    const ev = buildPharmacyWebUsageEvent({
      siteId: SITE, entryPointId: 'healthkr.drug_search', intent: 'drug_search', status: 'success', durationMs: 1234.6, domCommands: 7,
      now: new Date('2026-09-12T00:00:00.000Z'),
      // 아래 키들은 형상에 없으므로 결과에 나타날 수 없다.
      ...({ query: '아모디핀정', patientName: '홍길동', html: '<html>' } as Record<string, unknown>),
    } as any);
    expect(Object.keys(ev).sort()).toEqual([...PHARMACY_WEB_USAGE_KEYS].sort());
    expect(ev).toEqual({ siteId: SITE, entryPointId: 'healthkr.drug_search', intent: 'drug_search', status: 'success', errorCode: null, durationMs: 1235, domCommands: 7, timestamp: '2026-09-12T00:00:00.000Z' });
    expect(JSON.stringify(ev)).not.toMatch(/아모디핀|홍길동|html/);
    // 코어 · Adapter 소스에 환자 · 처방 · 주민번호 저장 구조가 없다(§51).
    for (const f of ['pharmacy-web-core.ts', 'healthkr-adapter.ts']) {
      const src = read(join(__dirname, '..', 'services', 'local-agent', f)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(src).not.toMatch(/patient|환자|처방|주민|prescription|cookie|localStorage|password|eval\(|new Function|executeScript|querySelector/i);
    }
  });
});
