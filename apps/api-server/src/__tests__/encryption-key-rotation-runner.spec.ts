/**
 * WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §4 — 교체 러너의 행 단위 계약
 * WO-O4O-ENCRYPTION-KEY-ROTATION-CANONICAL-DETECTION-DETERMINISM-FIX-V1 — canonical 판정 계약
 *
 * DB 없이 검증한다(가짜 저장소). 검증 대상은 §3 안전 원칙 그대로다:
 *   dry-run 은 write 0 / 멱등 SKIP / 복호화 불가 시 HOLD(삭제·재생성 금지) / 저장 검증 실패 시 행 rollback
 *
 * **fixture 는 의도한 판정 상태를 만족할 때까지 재생성한다.** 이유:
 * envelope 가 인증되지 않은 AES-256-CBC 라서, 무작위 IV 로 만든 암호문은 낮은 확률로
 * "틀린 키로도 복호화가 성공하는" 상태가 된다. 그 상태를 우연히 뽑으면 검증하려던 계약이
 * 아니라 다른 분기를 밟게 된다. 각 테스트가 **의도한 분기만** 밟도록 전제를 고정한다.
 * (모호성 자체는 아래 별도 테스트가 다룬다 — 숨기지 않는다.)
 */
import { rotateCell, isPlausibleCredential } from '../scripts/encryption-key-rotation.js';
import type { Cell } from '../scripts/encryption-key-rotation.js';
import * as cryptoUtil from '../utils/crypto.js';

jest.mock('../utils/crypto.js', () => {
  const actual = jest.requireActual('../utils/crypto.js');
  return { ...actual, decryptWithKey: jest.fn(actual.decryptWithKey) };
});

const { RETIRED_DEFAULT_ENCRYPTION_KEY, encryptWithKey, decryptWithKey } = cryptoUtil;

const CANONICAL = 'canonical-test-key-0123456789abcdef';
const THIRD_KEY = 'a-third-key-0123456789abcdefghijk';

/** 이 키로 읽어 **자격증명으로 성립**하는가 — 러너의 판정과 동일한 기준 */
function readableAs(value: string, rawKey: string): boolean {
  try {
    return isPlausibleCredential(jest.requireActual<typeof cryptoUtil>('../utils/crypto.js').decryptWithKey(value, rawKey));
  } catch {
    return false;
  }
}

/**
 * `key` 로 암호화하되, `mustNotReadAs` 의 어떤 키로도 읽히지 않는 암호문을 만든다.
 * 기대 반복 횟수 ≈ 1.003 회 (오탐률 2^-29 이므로 사실상 첫 시도에 성공한다).
 */
function makeCipher(plaintext: string, key: string, mustNotReadAs: string[]): string {
  for (let i = 0; i < 1000; i += 1) {
    const value = encryptWithKey(plaintext, key);
    if (mustNotReadAs.every((k) => !readableAs(value, k))) return value;
  }
  throw new Error('fixture-generation-failed');
}

/** 값을 실제로 보관하는 가짜 저장소. `corrupt` 를 주면 저장이 값을 훼손한다. */
function fakeCell(initial: string | null, corrupt = false): { cell: Cell; store: { value: string | null }; writes: string[] } {
  const store = { value: initial };
  const writes: string[] = [];
  return {
    store,
    writes,
    cell: {
      locator: 'fake:1:secret',
      ciphertext: initial,
      write: async (next: string) => {
        writes.push(next);
        // 첫 저장만 훼손한다 — rollback 저장은 정상 동작해야 한다
        store.value = corrupt && writes.length === 1 ? `${next.slice(0, 33)}deadbeef` : next;
      },
      readBack: async () => store.value,
    },
  };
}

afterEach(() => {
  (decryptWithKey as jest.Mock).mockClear();
});

describe('rotateCell', () => {
  it('dry-run 은 교체 대상으로 집계하되 write 를 하지 않는다', async () => {
    const { cell, writes } = fakeCell(makeCipher('v', RETIRED_DEFAULT_ENCRYPTION_KEY, [CANONICAL]));
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, false)).toBe('ROTATED');
    expect(writes).toHaveLength(0);
  });

  it('apply 는 새 키로 재암호화하고 값이 보존된다', async () => {
    const { cell, store } = fakeCell(makeCipher('pg-secret', RETIRED_DEFAULT_ENCRYPTION_KEY, [CANONICAL]));
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('ROTATED');
    expect(decryptWithKey(store.value as string, CANONICAL)).toBe('pg-secret');
  });

  it('이미 canonical 키로 읽히면 건드리지 않는다 (재실행 멱등)', async () => {
    const { cell, writes } = fakeCell(makeCipher('already', CANONICAL, [RETIRED_DEFAULT_ENCRYPTION_KEY]));
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe(
      'SKIPPED_ALREADY_CANONICAL',
    );
    expect(writes).toHaveLength(0);
  });

  it('빈 값은 대상이 아니다', async () => {
    for (const v of [null, '', '   ']) {
      const { cell, writes } = fakeCell(v);
      expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('EMPTY');
      expect(writes).toHaveLength(0);
    }
  });

  it('어느 키로도 못 읽으면 HOLD — 삭제하거나 새 값으로 덮어쓰지 않는다', async () => {
    const original = makeCipher('unknown-key-cipher', THIRD_KEY, [RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL]);
    const { cell, store, writes } = fakeCell(original);
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('HOLD_UNREADABLE');
    expect(writes).toHaveLength(0);
    expect(store.value).toBe(original);
  });

  it('암호문 포맷이 아닌 평문 잔재도 HOLD 로 남긴다', async () => {
    const { cell, store, writes } = fakeCell('plaintext-legacy-value');
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('HOLD_UNREADABLE');
    expect(writes).toHaveLength(0);
    expect(store.value).toBe('plaintext-legacy-value');
  });

  it('저장된 값이 검증에 실패하면 원래 값으로 되돌린다', async () => {
    const original = makeCipher('v', RETIRED_DEFAULT_ENCRYPTION_KEY, [CANONICAL]);
    const { cell, store, writes } = fakeCell(original, true);
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('ROLLED_BACK');
    expect(writes).toHaveLength(2); // 저장 + rollback
    expect(store.value).toBe(original);
    expect(decryptWithKey(store.value as string, RETIRED_DEFAULT_ENCRYPTION_KEY)).toBe('v');
  });
});

/**
 * WO-O4O-ENCRYPTION-KEY-ROTATION-CANONICAL-DETECTION-DETERMINISM-FIX-V1 §2–§4
 *
 * 이 절이 본 WO 의 본체다. 고치기 전의 러너는 "canonical 키로 복호화했는데 예외가 안 났다"
 * 를 곧바로 `SKIPPED_ALREADY_CANONICAL` 로 판정했다. AES-CBC/PKCS#7 에서 틀린 키도
 * 약 1/256 확률로 정상 패딩을 만들어내므로, **legacy 키로 암호화된 셀이 조용히 교체 누락**된다.
 */
describe('canonical 판정 — 틀린 키의 우연한 패딩 성공을 신뢰하지 않는다', () => {
  const actualCrypto = jest.requireActual<typeof cryptoUtil>('../utils/crypto.js');

  it('틀린 키로 복호화가 성공(정상 PKCS#7)해도 canonical 로 인정하지 않는다', async () => {
    // canonical 키로 "예외 없이" 복호화되는 legacy 암호문을 실제로 찾아낸다.
    // 기대 시도 횟수 ≈ 256. 이것이 고치기 전 러너가 오판하던 바로 그 입력이다.
    let poisoned: string | null = null;
    for (let i = 0; i < 200_000 && poisoned === null; i += 1) {
      const candidate = actualCrypto.encryptWithKey('v', RETIRED_DEFAULT_ENCRYPTION_KEY);
      try {
        actualCrypto.decryptWithKey(candidate, CANONICAL); // 예외가 안 나면 = 우연한 패딩 성공
        poisoned = candidate;
      } catch {
        /* 계속 */
      }
    }
    expect(poisoned).not.toBeNull();

    // 산출물이 자격증명으로 성립하지 않으므로 canonical 이 아니다 → 정상 교체된다.
    const { cell, store } = fakeCell(poisoned);
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('ROTATED');
    expect(actualCrypto.decryptWithKey(store.value as string, CANONICAL)).toBe('v');
  });

  it('무작위 IV 를 2000회 반복해도 판정이 흔들리지 않는다 (flake 재현 0)', async () => {
    const outcomes = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      const { cell } = fakeCell(actualCrypto.encryptWithKey('pg-secret', RETIRED_DEFAULT_ENCRYPTION_KEY));
      outcomes.add(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, false));
    }
    // 고치기 전에는 여기에 SKIPPED_ALREADY_CANONICAL 이 ~0.33% 섞여 들어왔다.
    expect([...outcomes]).toEqual(['ROTATED']);
  });

  it('두 키가 같은 AES 키로 파생되면 교체할 것이 없다 (SKIP)', async () => {
    // toAesKey 는 32바이트 초과분을 잘라낸다 — 원문이 달라도 파생 키가 같을 수 있다.
    const base = 'canonical-test-key-0123456789abcdef'.slice(0, 32);
    const { cell, writes } = fakeCell(encryptWithKey('same-key-value', base));
    expect(await rotateCell(cell, `${base}-TAIL-DIFFERS`, `${base}-OTHER-TAIL`, true)).toBe(
      'SKIPPED_ALREADY_CANONICAL',
    );
    expect(writes).toHaveLength(0);
  });

  it('양쪽 키로 서로 다른 자격증명이 읽히면 덮어쓰지 않고 HOLD_AMBIGUOUS 로 보고한다', async () => {
    // 이 상태는 실제로는 ~2^-29 확률이라 무작위로 만들어낼 수 없다.
    // 안전망이 실제로 동작하는지 확인하기 위해 복호화 결과만 통제한다.
    (decryptWithKey as jest.Mock).mockImplementation((_value: string, rawKey: string) =>
      rawKey === CANONICAL ? 'looks-like-a-secret' : 'also-looks-like-a-secret',
    );

    const original = actualCrypto.encryptWithKey('v', RETIRED_DEFAULT_ENCRYPTION_KEY);
    const { cell, store, writes } = fakeCell(original);
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('HOLD_AMBIGUOUS');
    expect(writes).toHaveLength(0);
    expect(store.value).toBe(original);

    (decryptWithKey as jest.Mock).mockImplementation(actualCrypto.decryptWithKey);
  });

  it('자격증명 술어는 제어문자·빈 값·비 ASCII 를 배제한다', () => {
    expect(isPlausibleCredential('sk_live_0123456789')).toBe(true);
    expect(isPlausibleCredential('a')).toBe(true);
    expect(isPlausibleCredential('')).toBe(false);
    expect(isPlausibleCredential('has\u0000null')).toBe(false);
    expect(isPlausibleCredential('has\nnewline')).toBe(false);
    expect(isPlausibleCredential('비ASCII')).toBe(false);
    expect(isPlausibleCredential('\uFFFD\uFFFD')).toBe(false);
  });
});
