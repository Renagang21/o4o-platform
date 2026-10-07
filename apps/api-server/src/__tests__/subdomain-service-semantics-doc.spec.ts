/**
 * 서브도메인 · 서비스 의미 정본 ↔ 코드 정합 — WO-O4O-SUBDOMAIN-SERVICE-SEMANTICS-DOCUMENT-ALIGNMENT-V1
 *
 * docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md §2 표의 주소 · 대상 · serviceKey 가
 * service-catalog · store-workspace 의 실제 값과 어긋나지 않는지 고정한다.
 * 문장 전체가 아니라 **행 단위 핵심 의미**만 본다 — 문구 다듬기로 깨지지 않게 한다.
 * DB · 네트워크 0.
 */
import * as fs from 'fs';
import * as path from 'path';
import { O4O_SERVICES, getService } from '../config/service-catalog.js';
import { STORE_WORKSPACE_HOST } from '../config/store-workspace.js';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf-8');

const DOC_PATH = 'docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md';
const doc = read(DOC_PATH);

/** §2 표에서 주소로 시작하는 행 하나를 찾는다. */
function row(host: string): string {
  const line = doc.split('\n').find((l) => l.startsWith(`| \`${host}`));
  if (!line) throw new Error(`${DOC_PATH} §2 에 ${host} 행이 없다`);
  return line;
}

describe('주소별 사업 의미 (§2)', () => {
  it('kpa.neture.co.kr = 약사 개인 대상 분회, 매장 서비스 아님', () => {
    const r = row('kpa.neture.co.kr');
    expect(r).toContain('약사 개인');
    expect(r).toContain('분회');
    expect(r).toContain('`kpa-branch`');
    expect(r).not.toContain('`kpa:*`');
  });

  it('pharmacy.neture.co.kr = 약국 사업자 대상 세미프랜차이즈 운영 · role prefix kpa:*', () => {
    const r = row('pharmacy.neture.co.kr');
    expect(r).toContain('약국 사업자');
    expect(r).toContain('세미프랜차이즈');
    expect(r).toContain('`kpa-society`');
    expect(r).toContain('`kpa:*`');
  });

  it('retail.neture.co.kr = 화장품 · 일반 소매 사업자 대상 세미프랜차이즈 운영', () => {
    const r = row('retail.neture.co.kr');
    expect(r).toContain('소매 사업자');
    expect(r).toContain('세미프랜차이즈');
    expect(r).toContain('`k-cosmetics`');
  });

  it('store.neture.co.kr = 공통 Store Workspace · serviceKey 없음', () => {
    const r = row('store.neture.co.kr');
    expect(r).toContain('Store Workspace');
    expect(r).toContain('**없음**');
  });

  it('Store 접근 모델(Owner · Member)을 명시한다 (§3-3)', () => {
    expect(doc).toContain('**Store Owner**');
    expect(doc).toContain('**Store Member**');
  });
});

describe('정본 표 ↔ 코드 값', () => {
  it.each([
    ['pharmacy.neture.co.kr', 'kpa-society'],
    ['retail.neture.co.kr', 'k-cosmetics'],
    ['supplier.neture.co.kr', 'supplier'],
    ['funding.neture.co.kr', 'funding'],
    ['community.neture.co.kr', 'community'],
    ['kpa.neture.co.kr', 'kpa-branch'],
  ])('%s 은 catalog `%s` 의 domain 이다', (host, key) => {
    expect(getService(key)?.domain).toBe(host);
    expect(row(host)).toContain(`\`${key}\``);
  });

  it('store.neture.co.kr 은 catalog 서비스가 아니고 store-workspace 호스트다', () => {
    expect(STORE_WORKSPACE_HOST).toBe('store.neture.co.kr');
    expect(O4O_SERVICES.some((s) => s.domain === STORE_WORKSPACE_HOST)).toBe(false);
  });

  it('kpa-branch catalog domain 은 kpa.neture.co.kr 이고 §4 에 옛 DEFERRED 차이가 남아 있지 않다', () => {
    expect(getService('kpa-branch')?.domain).toBe('kpa.neture.co.kr');
    expect(doc).not.toContain('catalog 이전은 handoff · slug 해석과 함께 DEFERRED');
  });

  it('CANONICAL-INDEX 가 정본을 등록한다', () => {
    expect(read('docs/CANONICAL-INDEX.md')).toContain('(baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md)');
  });
});
