/**
 * WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §4 — 교체 러너의 행 단위 계약
 *
 * DB 없이 검증한다(가짜 저장소). 검증 대상은 §3 안전 원칙 그대로다:
 *   dry-run 은 write 0 / 멱등 SKIP / 복호화 불가 시 HOLD(삭제·재생성 금지) / 저장 검증 실패 시 행 rollback
 */

import { rotateCell } from '../scripts/encryption-key-rotation.js';
import type { Cell } from '../scripts/encryption-key-rotation.js';
import { RETIRED_DEFAULT_ENCRYPTION_KEY, encryptWithKey, decryptWithKey } from '../utils/crypto.js';

const CANONICAL = 'canonical-test-key-0123456789abcdef';

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

describe('rotateCell', () => {
  it('dry-run 은 교체 대상으로 집계하되 write 를 하지 않는다', async () => {
    const { cell, writes } = fakeCell(encryptWithKey('v', RETIRED_DEFAULT_ENCRYPTION_KEY));
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, false)).toBe('ROTATED');
    expect(writes).toHaveLength(0);
  });

  it('apply 는 새 키로 재암호화하고 값이 보존된다', async () => {
    const { cell, store } = fakeCell(encryptWithKey('pg-secret', RETIRED_DEFAULT_ENCRYPTION_KEY));
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('ROTATED');
    expect(decryptWithKey(store.value as string, CANONICAL)).toBe('pg-secret');
  });

  it('이미 canonical 키로 읽히면 건드리지 않는다 (재실행 멱등)', async () => {
    const { cell, writes } = fakeCell(encryptWithKey('already', CANONICAL));
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
    const original = encryptWithKey('unknown-key-cipher', 'a-third-key-0123456789abcdefghijk');
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
    const original = encryptWithKey('v', RETIRED_DEFAULT_ENCRYPTION_KEY);
    const { cell, store, writes } = fakeCell(original, true);
    expect(await rotateCell(cell, RETIRED_DEFAULT_ENCRYPTION_KEY, CANONICAL, true)).toBe('ROLLED_BACK');
    expect(writes).toHaveLength(2); // 저장 + rollback
    expect(store.value).toBe(original);
    expect(decryptWithKey(store.value as string, RETIRED_DEFAULT_ENCRYPTION_KEY)).toBe('v');
  });
});
