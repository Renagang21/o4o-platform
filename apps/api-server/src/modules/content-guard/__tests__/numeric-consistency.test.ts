/**
 * 잠금 1 — **동일 수치를 읽는 모든 파싱 경로가 같은 정규화 규칙을 쓰는가**
 *
 * 30-A 실측: 소수점 억 오독(`1.5억` → `5억`, 3.3배)이 **4개 경로에 복제**돼 있었고,
 * 두 곳만 고친 상태로 배치를 돌리다 3번째·4번째를 발견했다.
 * 경로별로 테스트를 흩뿌리면 5번째 경로가 생길 때 또 놓친다.
 * 이 파일은 **모든 경로에 같은 입력을 넣어 같은 값이 나오는지**를 한자리에서 강제한다.
 *
 * 새 파싱 경로를 추가하면 여기 PATHS 에 등록할 것.
 */
import fs from 'node:fs';
import path from 'node:path';
import { extractKoCounts, NUM_TOKEN, KO_SCALE_TOKEN } from '../product-description-guard.units.js';
import { parseCfu } from '../source-grounding-parser.js';
import { runGuard, computeBasis } from '../product-description-guard.js';
import { OK_VIVA_FULL_BASIS } from './fixtures/known-errors.js';

/** 같은 의미의 수치를 읽는 독립 경로들 */
const PATHS: Array<{ name: string; read: (text: string) => number | null }> = [
  {
    name: 'units.extractKoCounts (초안 본문)',
    read: (t) => extractKoCounts(t)[0]?.value ?? null,
  },
  {
    name: 'source-grounding-parser.parseCfu (공식 원문)',
    read: (t) => {
      const r = parseCfu(`프로바이오틱스 수 : 표시량(${t} CFU/2g) 이상`);
      return r.kind === 'PARSED' ? r.value : null;
    },
  },
];

describe('잠금 1 — 수치 파싱 경로 일관성', () => {
  // 각 표기를 모든 경로에 넣어 **같은 값**이 나와야 한다
  const CASES: Array<[string, number]> = [
    ['1억', 1e8],
    ['100억', 1e10],
    ['1.5억', 1.5e8],   // ← 4개 경로에 복제됐던 결손
    ['2.5억', 2.5e8],
    ['5,000억', 5e11],
    ['30억', 3e9],
  ];

  for (const [text, expected] of CASES) {
    it(`"${text}" → ${expected.toExponential()} · 모든 경로 동일`, () => {
      for (const p of PATHS) {
        expect({ path: p.name, value: p.read(text) }).toEqual({ path: p.name, value: expected });
      }
    });
  }

  it('규칙 상수가 소수점·천단위 콤마를 모두 허용한다', () => {
    const re = new RegExp(`^${NUM_TOKEN}$`);
    for (const s of ['1', '100', '1.5', '2.5', '5,000', '10,000']) expect(re.test(s)).toBe(true);
    expect(new RegExp(`^${KO_SCALE_TOKEN}$`).test('억')).toBe(true);
  });

  /**
   * 회귀 방지: 소스에 숫자 패턴을 **직접** 박은 경로가 생기면 실패시킨다.
   * `[0-9][0-9,]*` 뒤에 소수점 허용이 없는 형태가 결손의 정확한 형상이었다.
   */
  it('억 스케일을 읽는 정규식이 공유 상수를 우회하지 않는다', () => {
    // jest 는 CJS 로 실행되므로 import.meta 대신 cwd(apps/api-server) 기준 경로
    const srcDir = path.resolve(process.cwd(), 'src/modules/content-guard');
    const offenders: string[] = [];
    for (const f of fs.readdirSync(srcDir).filter((x) => x.endsWith('.ts'))) {
      const body = fs.readFileSync(path.join(srcDir, f), 'utf8');
      for (const line of body.split('\n')) {
        if (line.trim().startsWith('*') || line.trim().startsWith('//')) continue; // 주석 제외
        // 한국어 스케일을 읽으면서 소수점을 허용하지 않는 숫자 패턴
        if (/\(조\|억\|만\|천\)|조\|억\|만\|천/.test(line) && /\[0-9\]\[0-9,\]\*(?!\(\?:\\\.)/.test(line)) {
          offenders.push(`${f}: ${line.trim().slice(0, 90)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('잠금 2 — 원문 근거가 있는데 막았던 사례의 원문 범위 고정', () => {
  /**
   * 규칙을 완화할 때는 **원문이 실제로 무엇을 진술했는지**를 테스트로 고정한다.
   * 아래 3건은 30-A 에서 "원문에 있는데 가드가 막은" 실측이며,
   * 완화 후에도 **근거가 없으면 여전히 막아야** 한다(쌍으로 고정).
   */
  const withSrc = (intake: string, ko: string) => ({
    ...OK_VIVA_FULL_BASIS,
    source: { ...OK_VIVA_FULL_BASIS.source, intake },
    drafts: { ko: `<p>${ko}</p>`, en: '<p>x</p>' },
  });

  it('그대로: 원문에 있으면 허용 / 없으면 차단', () => {
    // 실측 원문 — 리웰키드업
    const allowed = runGuard(withSrc('1일 2회, 1회 1포를 물, 음료, 요구르트, 우유에 타거나 그대로 섭취하십시오.', '그대로 섭취할 수 있습니다.'), { phase: 'post' });
    expect(allowed.findings.some((f) => f.ruleId === 'G-FORM-GENERALIZATION-001' && f.status === 'BLOCKED')).toBe(false);
    // 실측 원문 — 안티비오 (직접섭취 근거 없음)
    const blocked = runGuard(withSrc('성인 : 1일 3회, 1회 2포 (2그램), 소아 : 1일 2회, 1회 1포 (1그램)', '그대로 섭취할 수 있습니다.'), { phase: 'post' });
    expect(blocked.findings.some((f) => f.ruleId === 'G-FORM-GENERALIZATION-001' && f.status === 'BLOCKED')).toBe(true);
  });

  // V1.3 ServingSpec 보강 (100건 진입 전) — 중량 세 층위 구분 + 역산 금지.
  // 실측: Lacto Bloom "1회 2캡슐(900mg)" = 2캡슐 **합계** 900mg. 1캡슐 450mg 은 원문에 없다.
  describe('ServingSpec 3층 구분 · 역산 금지', () => {
    const lactoBloom = {
      ...OK_VIVA_FULL_BASIS,
      source: {
        ...OK_VIVA_FULL_BASIS.source,
        baseStandard: '프로바이오틱스 수 : 표시량(100,000,000CFU/900mg) 이상',
        intake: '1일 1회, 1회 2캡슐(900mg)을 물과 함께 섭취하십시오',
      },
      grounding: {
        declaredCfu: { absolute: 1e8 },
        declaredAmount: { value: 1, unit: '억 CFU', basisAmount: 900, basisUnit: 'mg' },
        serving: {
          unitType: 'capsule',
          unitWeight: null, unitWeightUnit: null,   // 1캡슐 중량은 원문에 없다
          unitsPerServing: 2,
          servingTotalWeight: 900, servingTotalWeightUnit: 'mg', // 원문 명시
          servingsPerDay: 1,
        },
        ageBandsRaw: null,
      },
    };

    it('1회 총중량만 있어도 기준량 대응은 확정된다 (이전엔 환산 불가였다)', () => {
      const b = computeBasis(lactoBloom as never);
      expect(b.allowed).toBe(true);
      // 1일 1회 제품이라 1회분 == 1일분 → basisEquals 는 'daily'/'serving' 둘 다 유효
      expect(['serving', 'daily']).toContain(b.basisEquals);
      expect(b.perServingCount).toBe(1e8);
      expect(b.servingMg).toBe(900); // 원문 명시 1회 총중량이 그대로 쓰였다
    });

    it('1단위 중량이 없으면 per-unit 은 금지된다 (역산 금지)', () => {
      const b = computeBasis(lactoBloom as never);
      expect(b.perUnitAllowed).toBe(false);
      expect(b.perUnitCount).toBeUndefined(); // 5천만 CFU 로 역산하지 않는다
    });

    it('그럼에도 초안이 1캡슐당 수치를 쓰면 BLOCKED', () => {
      const r = runGuard(
        { ...lactoBloom, drafts: { ko: '<p>1캡슐당 5천만 CFU가 들어 있습니다.</p>', en: '<p>x</p>' } } as never,
        { phase: 'post' },
      );
      expect(r.findings.some((f) => f.ruleId === 'A-PER-UNIT-DERIVED-003' && f.status === 'BLOCKED')).toBe(true);
    });

    it('1회 총중량 기준 서술은 통과', () => {
      const r = runGuard(
        { ...lactoBloom, drafts: { ko: '<p>1회 2캡슐(900mg)이 표시 기준량 900mg과 같습니다.</p>', en: '<p>x</p>' } } as never,
        { phase: 'post' },
      );
      expect(r.findings.some((f) => f.status === 'BLOCKED')).toBe(false);
    });

    it('원문 명시 1회 총중량과 1단위×개수가 어긋나면 환산 불가 (모순 검출)', () => {
      const contradictory = {
        ...lactoBloom,
        grounding: {
          ...lactoBloom.grounding,
          serving: { ...lactoBloom.grounding.serving, unitWeight: 500, unitWeightUnit: 'mg' }, // 500×2=1000 ≠ 900
        },
      };
      const b = computeBasis(contradictory as never);
      expect(b.allowed).toBe(false);
      expect(b.reason).toMatch(/모순/);
    });

    it('1일 총중량도 원문 명시가 우선하며, 어긋나면 모순', () => {
      const bad = {
        ...lactoBloom,
        grounding: {
          ...lactoBloom.grounding,
          serving: { ...lactoBloom.grounding.serving, dailyTotalWeight: 1800, dailyTotalWeightUnit: 'mg' }, // 900×1 ≠ 1800
        },
      };
      expect(computeBasis(bad as never).reason).toMatch(/1일 총중량 모순/);
    });
  });

  // 30건(A·B·C) 실측 튜닝 — "계산이 필요 없습니다" 는 문서 행위 서술이지 제품 주장이 아니다.
  // 16/16 전부 사람 해제됐다. 단 **문맥 창으로 강등하면 미탐**이 생기므로 결합 매치만 INFO.
  describe('C-ABSENCE 계산 서술 튜닝 (30건 실측)', () => {
    const withKo = (ko: string) => ({
      ...OK_VIVA_FULL_BASIS,
      drafts: { ko: `<p>${ko}</p>`, en: '<p>x</p>' },
    });

    it('"계산이 필요 없습니다" → INFO (최종 REVIEW 집계 제외)', () => {
      const r = runGuard(withKo('표시 기준량 2g = 1포 = 하루 섭취량 — 계산이 필요 없습니다.'), { phase: 'post' });
      const f = r.findings.find((x) => x.ruleId === 'C-ABSENCE-CALC-STATEMENT-006')!;
      expect(f).toBeDefined();
      expect(f.status).toBe('INFO');
      expect(r.findings.some((x) => x.ruleId === 'C-ABSENCE-NUMERIC-003')).toBe(false);
    });

    it('**미탐 방지**: 같은 문장에 제품 주장이 붙으면 그것은 강등되지 않는다', () => {
      // 문맥 창(45자)으로 판정했다면 "물이 필요 없습니다" 까지 INFO 로 새어나간다
      const r = runGuard(
        withKo('표시 기준량 2g = 1포 = 하루 섭취량 — 계산이 필요 없습니다. 물이 필요 없습니다.'),
        { phase: 'post' },
      );
      const risky = r.findings.filter((x) => x.ruleId.startsWith('C-ABSENCE') && (x.status === 'BLOCKED' || x.status === 'REVIEW_REQUIRED'));
      expect(risky.length).toBeGreaterThan(0); // 물 주장은 반드시 남는다
      expect(r.findings.some((x) => x.ruleId === 'C-ABSENCE-CALC-STATEMENT-006')).toBe(true); // 계산 서술은 INFO
    });

    it('계산과 무관한 부재 주장은 그대로 검출', () => {
      const r = runGuard(withKo('냉장이 필요 없습니다.'), { phase: 'post' });
      expect(r.findings.some((x) => x.ruleId.startsWith('C-ABSENCE')
        && (x.status === 'BLOCKED' || x.status === 'REVIEW_REQUIRED'))).toBe(true);
    });
  });

  // 30-B 실측 — 보관 조건. 키워드 존재 ≠ 주장 뒷받침.
  it('보관: 원문이 냉장인데 실온이라 쓰면 BLOCKED / 원문대로 쓰면 통과', () => {
    const cold = { ...OK_VIVA_FULL_BASIS.source, storage: '냉장(0~10도)에 보관하십시오. 개봉 후에는 가급적 빨리 섭취하십시오.' };
    const bad = runGuard(
      { ...OK_VIVA_FULL_BASIS, source: cold, drafts: { ko: '<p>실온 보관 — 냉장고 자리를 차지하지 않습니다.</p>', en: '<p>x</p>' } },
      { phase: 'post' },
    );
    expect(bad.findings.some((f) => f.ruleId === 'D-STORAGE-CONTRADICTION-009' && f.status === 'BLOCKED')).toBe(true);

    const good = runGuard(
      { ...OK_VIVA_FULL_BASIS, source: cold, drafts: { ko: '<p>냉장(0~10도) 보관 — 공식 보관 조건입니다.</p>', en: '<p>x</p>' } },
      { phase: 'post' },
    );
    expect(good.findings.some((f) => f.ruleId.startsWith('D-STORAGE'))).toBe(false);
  });

  it('보관: 원문이 실온이면 실온 서술은 위반이 아니다', () => {
    const room = { ...OK_VIVA_FULL_BASIS.source, storage: '직사광선을 피하여 실온에서 보관' };
    const r = runGuard(
      { ...OK_VIVA_FULL_BASIS, source: room, drafts: { ko: '<p>실온 보관이 가능합니다.</p>', en: '<p>x</p>' } },
      { phase: 'post' },
    );
    expect(r.findings.some((f) => f.ruleId.startsWith('D-STORAGE'))).toBe(false);
  });

  it('물과 함께 씹어: 원문에 있으면 허용 / 원문이 물을 말하지 않으면 차단', () => {
    // 실측 원문 — 청인 해우
    const allowed = runGuard(withSrc('1일 3회, 1회 1포씩 식전 또는 식후에 물과 함께 씹어드십시오.', '물과 함께 씹어서 섭취합니다.'), { phase: 'post' });
    expect(allowed.findings.some((f) => f.ruleId === 'G-CHEWABLE-002')).toBe(false);
    const blocked = runGuard(withSrc('1일 2회, 1회 1정을 씹어서 섭취하십시오.', '물과 함께 삼키면 됩니다.'), { phase: 'post' });
    expect(blocked.findings.some((f) => f.ruleId === 'G-CHEWABLE-002' && f.status === 'BLOCKED')).toBe(true);
  });
});
