/**
 * 매장 실행 홈 — 모델 계약 테스트
 * WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1 §3 · §4 · §5 · §8 · §12
 *
 * 이 테스트가 지키는 것은 "동작" 이 아니라 **계약**이다.
 * 실행 홈은 매장 경영자에게 "지금 어디에서 무엇이 쓰이고 있는가" 를 단언하는 화면이라,
 * 추측으로 묶거나 없는 숫자를 만들면 화면이 **틀린 사실**을 말하게 된다.
 * 아래 항목이 깨지면 그건 리팩터링이 아니라 범위 변경이다 — 별도 WO 가 필요하다.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  STORE_EXECUTION_STATUS_LABELS,
  STORE_EXECUTION_GROUP_LABELS,
  resolveTabletExecutionStatus,
  resolveQrExecutionStatus,
  groupStoreExecution,
  summarizeStoreExecution,
  type StoreExecutionQrInput,
  type StoreExecutionTabletInput,
} from '../storeExecutionModel';

const EXEC_DIR = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(EXEC_DIR, rel), 'utf-8');

/** 주석에는 서비스 이름이 나올 수 있다(설계 근거 서술) — 분기 검사는 **코드**만 본다. */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const tablet = (over: Partial<StoreExecutionTabletInput> = {}): StoreExecutionTabletInput => ({
  id: 't1',
  name: '태블릿 1',
  location: '구강관리 코너',
  isActive: true,
  currentScreenSetId: 'ss1',
  ...over,
});

const qr = (over: Partial<StoreExecutionQrInput> = {}): StoreExecutionQrInput => ({
  id: 'q1',
  title: 'QR 1',
  isActive: true,
  landable: true,
  primaryPlacement: null,
  activePlacementCount: 0,
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§8 상태 4종 — 표시 전용 어휘', () => {
  it('네 가지 상태만 존재하고 라벨이 고정되어 있다', () => {
    expect(STORE_EXECUTION_STATUS_LABELS).toEqual({
      ok: '정상',
      unset: '미설정',
      stopped: '중지',
      attention: '확인 필요',
    });
  });

  it('배치가 2곳 이상이면 정상으로 접지 않고 확인 필요로 남긴다', () => {
    const bySentinel = resolveQrExecutionStatus(
      qr({ primaryPlacement: 'MULTIPLE', activePlacementCount: undefined }),
    );
    expect(bySentinel.status).toBe('attention');
    expect(bySentinel.reasons).toContain('QR_MULTIPLE_PLACEMENT');

    // 카운트만으로도 같은 판정이어야 한다 — sentinel 유무에 의존하지 않는다.
    const byCount = resolveQrExecutionStatus(qr({ primaryPlacement: 'A-2', activePlacementCount: 3 }));
    expect(byCount.status).toBe('attention');
  });

  it('활성인데 연결 대상이 열리지 않으면 확인 필요다', () => {
    expect(resolveQrExecutionStatus(qr({ landable: false, activePlacementCount: 1 })).status).toBe(
      'attention',
    );
  });

  it('경영자가 끈 QR 은 중지, 만들기만 한 QR 은 미설정이다', () => {
    expect(resolveQrExecutionStatus(qr({ isActive: false })).status).toBe('stopped');
    expect(resolveQrExecutionStatus(qr({ activePlacementCount: 0 })).status).toBe('unset');
    expect(resolveQrExecutionStatus(qr({ activePlacementCount: 1 })).status).toBe('ok');
  });

  it('꺼진 태블릿은 화면 세트가 없어도 미설정이 아니라 중지다', () => {
    // 할 일을 잘못 안내하지 않기 위한 우선순위다.
    const t = resolveTabletExecutionStatus(tablet({ isActive: false, currentScreenSetId: null }));
    expect(t.status).toBe('stopped');
    expect(t.reasons[0]).toBe('TABLET_INACTIVE');
  });

  it('위치가 없거나 화면 세트가 없는 활성 태블릿은 미설정이다', () => {
    expect(resolveTabletExecutionStatus(tablet({ currentScreenSetId: null })).status).toBe('unset');
    expect(resolveTabletExecutionStatus(tablet({ location: '   ' })).status).toBe('unset');
    expect(resolveTabletExecutionStatus(tablet()).status).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§4 위치 묶음 — 완전 일치와 cornerRef 두 경로뿐', () => {
  it('위치 문자열이 완전히 같을 때만 같은 코너로 묶는다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: '구강관리 코너' })],
      [qr({ id: 'q1', primaryPlacement: '구강관리 코너', activePlacementCount: 1 })],
    );
    const corner = groups.find((g) => g.label === '구강관리 코너');
    expect(corner?.kind).toBe('corner');
    expect(corner?.qrs.map((q) => q.id)).toEqual(['q1']);
  });

  it('유사한 위치 이름을 추측으로 묶지 않는다 (fuzzy matching 금지)', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: '카운터' })],
      [qr({ id: 'q1', primaryPlacement: '계산대', activePlacementCount: 1 })],
    );
    expect(groups.find((g) => g.label === '카운터')?.qrs).toEqual([]);
    // 단정할 수 없으면 추측하지 않고 미배치 묶음으로 보낸다.
    expect(groups.find((g) => g.kind === 'qr-unplaced')?.qrs.map((q) => q.id)).toEqual(['q1']);
  });

  it('대소문자·공백만 다른 값도 다른 위치로 본다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: 'A-2' })],
      [qr({ id: 'q1', primaryPlacement: 'a-2', activePlacementCount: 1 })],
    );
    expect(groups.find((g) => g.label === 'A-2')?.qrs).toEqual([]);
  });

  it('앞뒤 공백은 정규화한다 — 같은 위치를 두 코너로 쪼개지 않는다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: '  A-2 ' })],
      [qr({ id: 'q1', primaryPlacement: 'A-2  ', activePlacementCount: 1 })],
    );
    const corner = groups.find((g) => g.label === 'A-2');
    expect(corner?.qrs.map((q) => q.id)).toEqual(['q1']);
  });

  it('cornerRef 가 태블릿 id 와 완전 일치하면 그 코너로 묶는다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 'tablet-uuid', location: '피부관리 코너' })],
      [qr({ id: 'q1', cornerRef: 'tablet-uuid', primaryPlacement: '엉뚱한 값', activePlacementCount: 1 })],
    );
    expect(groups.find((g) => g.label === '피부관리 코너')?.qrs.map((q) => q.id)).toEqual(['q1']);
  });

  it('MULTIPLE 은 위치를 단정하지 않는다 — 어느 코너에도 넣지 않는다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: 'A-2' })],
      [qr({ id: 'q1', primaryPlacement: 'MULTIPLE', activePlacementCount: 2 })],
    );
    expect(groups.find((g) => g.label === 'A-2')?.qrs).toEqual([]);
    const unplaced = groups.find((g) => g.kind === 'qr-unplaced');
    expect(unplaced?.qrs.map((q) => q.id)).toEqual(['q1']);
    expect(unplaced?.qrs[0].status).toBe('attention');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§5 미분류 묶음 — 정상 코너에 섞지 않는다', () => {
  it('위치 없는 태블릿과 미배치 QR 은 각각 별도 묶음이며 항상 마지막이다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: 'A-2' }), tablet({ id: 't2', location: null })],
      [qr({ id: 'q1', activePlacementCount: 0 })],
    );
    expect(groups.map((g) => g.kind)).toEqual(['corner', 'tablet-unlocated', 'qr-unplaced']);
    expect(groups[1].label).toBe(STORE_EXECUTION_GROUP_LABELS['tablet-unlocated']);
    expect(groups[2].label).toBe(STORE_EXECUTION_GROUP_LABELS['qr-unplaced']);
    expect(groups[1].tablets.map((t) => t.id)).toEqual(['t2']);
  });

  it('해당 대상이 없으면 빈 묶음을 만들지 않는다', () => {
    const groups = groupStoreExecution([tablet({ id: 't1', location: 'A-2' })], []);
    expect(groups.map((g) => g.kind)).toEqual(['corner']);
  });

  it('코너 roll-up 은 가장 심각한 상태를 드러내고 개수도 함께 남긴다', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: 'A-2' }), tablet({ id: 't2', location: 'A-2', currentScreenSetId: null })],
      [],
    );
    const corner = groups[0];
    expect(corner.status).toBe('unset'); // 정상 1 + 미설정 1 → 접지 않고 미설정을 드러낸다
    expect(corner.statusCounts).toEqual({ ok: 1, unset: 1, stopped: 0, attention: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§3 실측 가능한 수치만 — 없는 숫자를 만들지 않는다', () => {
  it('묶음 수치는 QR scan 합계뿐이다 (태블릿은 scan 에 기여하지 않는다)', () => {
    const groups = groupStoreExecution(
      [tablet({ id: 't1', location: 'A-2' })],
      [
        qr({ id: 'q1', primaryPlacement: 'A-2', activePlacementCount: 1, scanCount: 7 }),
        qr({ id: 'q2', primaryPlacement: 'A-2', activePlacementCount: 1, scanCount: 3 }),
      ],
    );
    expect(groups[0].scanCount).toBe(10);
  });

  it('요약에 태블릿 노출수·재생수·도달률 같은 미측정 지표가 없다', () => {
    const summary = summarizeStoreExecution(groupStoreExecution([tablet()], [qr({ scanCount: 5 })]));
    const forbidden = ['impression', 'view', 'play', 'reach', 'exposure', 'ctr'];
    for (const key of Object.keys(summary)) {
      for (const bad of forbidden) {
        expect(key.toLowerCase()).not.toContain(bad);
      }
    }
    expect(summary.scanTotal).toBe(5);
  });

  it('요약 집계가 묶음 내용과 어긋나지 않는다', () => {
    const summary = summarizeStoreExecution(
      groupStoreExecution(
        [tablet({ id: 't1', location: 'A-2' }), tablet({ id: 't2', location: null })],
        [
          qr({ id: 'q1', primaryPlacement: 'A-2', activePlacementCount: 1, scanCount: 4 }),
          qr({ id: 'q2', activePlacementCount: 0, scanCount: 6 }),
          qr({ id: 'q3', primaryPlacement: 'MULTIPLE', activePlacementCount: 2 }),
        ],
      ),
    );
    expect(summary.cornerCount).toBe(1);
    expect(summary.tabletTotal).toBe(2);
    expect(summary.tabletInUse).toBe(1);
    expect(summary.tabletUnlocated).toBe(1);
    expect(summary.qrTotal).toBe(3);
    expect(summary.qrPlaced).toBe(2);
    expect(summary.qrUnplaced).toBe(1);
    expect(summary.qrAmbiguous).toBe(1);
    expect(summary.scanTotal).toBe(10);
  });

  it('아무것도 없는 매장에서도 0 을 정직하게 만든다', () => {
    const summary = summarizeStoreExecution(groupStoreExecution([], []));
    expect(summary.cornerCount).toBe(0);
    expect(summary.scanTotal).toBe(0);
    expect(summary.statusCounts).toEqual({ ok: 0, unset: 0, stopped: 0, attention: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('§2 · §12 v1 범위와 경계 — 원본 소스로 고정', () => {
  const sources = ['storeExecutionModel.ts', 'StoreExecutionHomeView.tsx', 'index.ts'];

  it('serviceKey 분기가 0 이다 — KPA·Pharmacy-Hub 는 같은 Core 를 쓴다', () => {
    for (const f of sources) {
      const code = readCode(f);
      expect(code).not.toMatch(/serviceKey/i);
      expect(code).not.toMatch(/['"](kpa|kpa-society|pharmacy-hub|cosmetics|neture)['"]/);
    }
  });

  it('POP · Signage · ESL 을 v1 표면으로 다루지 않는다', () => {
    for (const f of sources) {
      const code = readCode(f);
      for (const bad of ['pop', 'signage', 'esl']) {
        expect(code.toLowerCase()).not.toMatch(new RegExp(`\\b${bad}\\b`));
      }
    }
  });

  it('StoreChannelsView(외부 채널 계약) 와 개념을 섞지 않는다', () => {
    // 실행 홈 = 매장 내부 물리 배치 / StoreChannelsView = 외부·플랫폼 채널.
    // 같은 데이터를 두 화면에서 다르게 세지 않도록 채널 개념을 입력에도 출력에도 두지 않는다.
    for (const f of sources) {
      const code = readCode(f);
      expect(code).not.toMatch(/StoreChannel|channelType|channelCode/);
    }
  });

  it('계층 계약을 지킨다 — 편집기 패키지에 의존하지 않는다', () => {
    for (const f of sources) {
      expect(read(f)).not.toMatch(/from\s+['"]@o4o\/tablet-screen-set-editor['"]/);
    }
  });

  it('Core 는 데이터를 스스로 불러오지 않는다 — 서비스가 주입한다', () => {
    for (const f of sources) {
      const code = readCode(f);
      expect(code).not.toMatch(/\bfetch\(|axios|apiClient|useQuery/);
    }
  });
});
