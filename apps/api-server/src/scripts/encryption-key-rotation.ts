/**
 * ENCRYPTION_KEY 교체 러너 (기존 암호문 재암호화)
 * WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §4
 *
 * Usage:
 *   npx tsx src/scripts/encryption-key-rotation.ts               # dry-run (기본)
 *   npx tsx src/scripts/encryption-key-rotation.ts --apply       # 실제 UPDATE
 *   npx tsx src/scripts/encryption-key-rotation.ts --legacy-key-env OLD_ENCRYPTION_KEY
 *
 * 전제:
 *   - `ENCRYPTION_KEY` 에 **새 canonical 키**가 들어있어야 한다(32바이트 이상, 은퇴 기본 키 아님).
 *   - legacy 키 기본값 = 소스에 박혀 있던 은퇴 기본 키. 다른 키로 암호화된 이력이 있으면
 *     `--legacy-key-env` 로 그 키가 든 환경변수 이름을 준다.
 *
 * 안전 계약 (WO §3):
 *   - **기본은 dry-run.** `--apply` 없이는 UPDATE 를 실행하지 않는다.
 *   - **멱등**: 이미 canonical 키로 읽히는 값은 건드리지 않고 SKIP.
 *   - **삭제·재생성 금지**: legacy/canonical 어느 키로도 못 읽으면 HOLD 로 남기고 그대로 둔다.
 *   - **모호하면 손대지 않는다**: 두 키 모두로 서로 다른 자격증명이 읽히면 HOLD_AMBIGUOUS.
 *     (WO-O4O-ENCRYPTION-KEY-ROTATION-CANONICAL-DETECTION-DETERMINISM-FIX-V1)
 *   - **행 단위 rollback**: 재암호화 후 즉시 읽어 검증하고, 검증 실패 시 원래 값으로 되돌린다.
 *   - 평문 credential 을 로그에 출력하지 않는다. 길이·상태만 집계한다.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  RETIRED_DEFAULT_ENCRYPTION_KEY,
  decryptWithKey,
  encryptWithKey,
  isEncryptionKeyConfigured,
} from '../utils/crypto.js';

/**
 * 이 러너는 **raw SQL 만** 쓴다. 전체 entity 그래프를 로드하지 않는 자체 DataSource 를 만든다.
 * (AppDataSource 를 쓰면 무관한 entity 의 decorator metadata 문제까지 끌고 들어온다.)
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [],
  synchronize: false,
  migrationsRun: false,
  logging: false,
});

export type Outcome =
  | 'ROTATED'
  | 'SKIPPED_ALREADY_CANONICAL'
  | 'HOLD_UNREADABLE'
  | 'HOLD_AMBIGUOUS'
  | 'EMPTY'
  | 'ROLLED_BACK';

export interface Cell {
  /** 사람이 읽는 위치 식별자. 값이 아니라 위치만 적는다. */
  locator: string;
  ciphertext: string | null;
  /** 새 암호문 저장 */
  write: (next: string) => Promise<void>;
  /** 저장된 값을 실제로 다시 읽는다. 검증은 메모리 값이 아니라 **저장소 값**으로 한다. */
  readBack: () => Promise<string | null>;
}

interface Tally {
  target: string;
  cells: number;
  rotated: number;
  skipped: number;
  hold: number;
  ambiguous: number;
  empty: number;
  rolledBack: number;
  holdLocators: string[];
  ambiguousLocators: string[];
}

const CIPHER_FORMAT = /^[0-9a-f]{32}:[0-9a-f]+$/;

/**
 * WO-O4O-ENCRYPTION-KEY-ROTATION-CANONICAL-DETECTION-DETERMINISM-FIX-V1 §2–§4
 *
 * **"복호화가 예외를 안 던졌다" 는 키가 맞다는 증거가 아니다.**
 * 이 envelope 는 `ivHex:cipherHex` — AES-256-CBC 이고 **인증 태그가 없다.**
 * PKCS#7 은 틀린 키로 복호화해도 마지막 블록의 패딩이 우연히 유효할 수 있다.
 * 실측 오탐률 ≈ 0.33% (66/20000) — 이론값 1/256 과 일치한다.
 *
 * 이 오탐이 production 에서 뜻하는 것: legacy 키로 암호화된 셀이 "이미 canonical" 로
 * 판정돼 **교체되지 않은 채 보고조차 되지 않는다.** 키 교체가 조용히 누락된다.
 *
 * 그래서 복호화 결과가 **이 도메인의 자격증명으로 성립하는지**까지 확인한다.
 * 대상 셀은 전부 credential 문자열이다 — PG api_key/api_secret · OAuth clientSecret ·
 * Cafe24 access/refresh token. 규격상 base64 / hex / 영숫자이며 제어문자가 없다.
 * 틀린 키의 산출물은 균일 난수 바이트이므로 이 술어를 통과할 확률은
 * 가장 짧은 자격증명(1블록)에서도 (95/256)^15 ≈ 2^-21 이다. 패딩 확률과 합쳐 ≈ 2^-29.
 *
 * 주의: 이것은 **암호학적 인증이 아니다.** envelope 에 태그가 없는 한 결정적 판정은
 * 불가능하다(§5 — 더 강한 식별 계약은 별도 설계로 등재). 여기서 하는 일은
 * 오탐률을 2^-8 → 2^-29 로 낮추고, 남은 실패를 **조용한 미교체가 아니라 보고되는 보류**로
 * 바꾸는 것이다.
 */
const CREDENTIAL_TEXT = /^[\x20-\x7e]+$/;

export function isPlausibleCredential(plaintext: string): boolean {
  return plaintext.length > 0 && CREDENTIAL_TEXT.test(plaintext);
}

/** 주어진 키로 읽어 **자격증명으로 성립할 때만** 평문을 돌려준다. 아니면 null. */
function readAs(value: string, rawKey: string): string | null {
  try {
    const plaintext = decryptWithKey(value, rawKey);
    return isPlausibleCredential(plaintext) ? plaintext : null;
  } catch {
    return null;
  }
}

function parseFlags(argv: string[]): { apply: boolean; legacyKey: string } {
  const apply = argv.includes('--apply');
  const i = argv.indexOf('--legacy-key-env');
  let legacyKey = RETIRED_DEFAULT_ENCRYPTION_KEY;
  if (i >= 0 && i + 1 < argv.length) {
    const envName = argv[i + 1];
    const v = process.env[envName];
    if (!v) {
      console.error(`--legacy-key-env ${envName} 가 비어 있습니다`);
      process.exit(2);
    }
    legacyKey = v;
  }
  return { apply, legacyKey };
}

/** 한 셀 처리. 실제 write 는 apply 일 때만. (테스트에서 직접 호출한다) */
export async function rotateCell(cell: Cell, legacyKey: string, canonicalKey: string, apply: boolean): Promise<Outcome> {
  const value = cell.ciphertext;
  if (!value || value.trim().length === 0) return 'EMPTY';

  // 0) 암호문 포맷이 아니면 어느 키도 시도하지 않는다 (평문 잔재 등)
  if (!CIPHER_FORMAT.test(value)) return 'HOLD_UNREADABLE';

  // 1) 두 키를 **모두** 시도한다. 어느 한쪽 성공에 기대어 조기 판정하지 않는다.
  const asCanonical = readAs(value, canonicalKey);
  const asLegacy = readAs(value, legacyKey);

  if (asCanonical !== null && asLegacy !== null) {
    // 같은 평문이면 두 키가 사실상 동일하다 (원문 문자열이 달라도 파생 AES 키가 같을 수 있다).
    // 교체할 것이 없으므로 멱등 SKIP.
    if (asCanonical === asLegacy) return 'SKIPPED_ALREADY_CANONICAL';
    // 서로 다른 평문이 둘 다 자격증명으로 성립한다 → 어느 쪽이 진짜인지 단정할 수 없다.
    // **추측해서 덮어쓰지 않는다.** 보고하고 그대로 둔다.
    return 'HOLD_AMBIGUOUS';
  }

  // 2) canonical 로만 읽힌다 → 이미 교체됨 (멱등)
  if (asCanonical !== null) return 'SKIPPED_ALREADY_CANONICAL';

  // 3) 어느 키로도 못 읽는다 → 임의 재생성·삭제 금지. 보고만 한다.
  if (asLegacy === null) return 'HOLD_UNREADABLE';

  const plaintext = asLegacy;

  if (!apply) return 'ROTATED'; // dry-run 은 "교체 가능" 으로 집계한다

  const next = encryptWithKey(plaintext, canonicalKey);
  await cell.write(next);

  // 4) 저장 직후 **저장소에서 다시 읽어** canonical 키로 복호화 검증
  try {
    const stored = await cell.readBack();
    if (!stored) throw new Error('readback-empty');
    const verified = decryptWithKey(stored, canonicalKey);
    if (verified !== plaintext) throw new Error('roundtrip-mismatch');
    return 'ROTATED';
  } catch {
    await cell.write(value); // 행 단위 rollback
    return 'ROLLED_BACK';
  }
}

async function collectPaymentConfigCells(): Promise<Cell[]> {
  const rows: Array<{ id: string; api_key: string | null; api_secret: string | null }> =
    await AppDataSource.query(`SELECT id, api_key, api_secret FROM platform_store_payment_configs`);
  const cells: Cell[] = [];
  for (const r of rows) {
    cells.push({
      locator: `platform_store_payment_configs:${r.id}:api_key`,
      ciphertext: r.api_key,
      write: async (next) => {
        await AppDataSource.query(`UPDATE platform_store_payment_configs SET api_key = $1 WHERE id = $2`, [next, r.id]);
      },
      readBack: async () => {
        const [row] = await AppDataSource.query(
          `SELECT api_key AS v FROM platform_store_payment_configs WHERE id = $1`, [r.id]);
        return row?.v ?? null;
      },
    });
    cells.push({
      locator: `platform_store_payment_configs:${r.id}:api_secret`,
      ciphertext: r.api_secret,
      write: async (next) => {
        await AppDataSource.query(`UPDATE platform_store_payment_configs SET api_secret = $1 WHERE id = $2`, [
          next,
          r.id,
        ]);
      },
      readBack: async () => {
        const [row] = await AppDataSource.query(
          `SELECT api_secret AS v FROM platform_store_payment_configs WHERE id = $1`, [r.id]);
        return row?.v ?? null;
      },
    });
  }
  return cells;
}

async function collectOAuthSettingCells(): Promise<Cell[]> {
  const rows: Array<{ key: string; value: Record<string, any> }> = await AppDataSource.query(
    `SELECT key, value FROM settings WHERE key = 'oauth_settings'`,
  );
  const cells: Cell[] = [];
  for (const row of rows) {
    for (const provider of ['google', 'kakao', 'naver']) {
      const current = row.value?.[provider]?.clientSecret;
      if (typeof current !== 'string') continue;
      cells.push({
        locator: `settings:oauth_settings:${provider}.clientSecret`,
        ciphertext: current,
        write: async (next) => {
          await AppDataSource.query(
            `UPDATE settings SET value = jsonb_set(value, ARRAY[$1,'clientSecret'], to_jsonb($2::text), true)
              WHERE key = 'oauth_settings'`,
            [provider, next],
          );
        },
        readBack: async () => {
          const [row] = await AppDataSource.query(
            `SELECT value -> $1 ->> 'clientSecret' AS v FROM settings WHERE key = 'oauth_settings'`, [provider]);
          return row?.v ?? null;
        },
      });
    }
  }
  return cells;
}

async function collectCafe24Cells(): Promise<Cell[]> {
  const rows: Array<{ id: string; access_token_enc: string | null; refresh_token_enc: string | null }> =
    await AppDataSource.query(`SELECT id, access_token_enc, refresh_token_enc FROM cafe24_connections`);
  const cells: Cell[] = [];
  for (const r of rows) {
    cells.push({
      locator: `cafe24_connections:${r.id}:access_token_enc`,
      ciphertext: r.access_token_enc,
      write: async (next) => {
        await AppDataSource.query(`UPDATE cafe24_connections SET access_token_enc = $1 WHERE id = $2`, [next, r.id]);
      },
      readBack: async () => {
        const [row] = await AppDataSource.query(
          `SELECT access_token_enc AS v FROM cafe24_connections WHERE id = $1`, [r.id]);
        return row?.v ?? null;
      },
    });
    cells.push({
      locator: `cafe24_connections:${r.id}:refresh_token_enc`,
      ciphertext: r.refresh_token_enc,
      write: async (next) => {
        await AppDataSource.query(`UPDATE cafe24_connections SET refresh_token_enc = $1 WHERE id = $2`, [next, r.id]);
      },
      readBack: async () => {
        const [row] = await AppDataSource.query(
          `SELECT refresh_token_enc AS v FROM cafe24_connections WHERE id = $1`, [r.id]);
        return row?.v ?? null;
      },
    });
  }
  return cells;
}

async function runTarget(
  target: string,
  collect: () => Promise<Cell[]>,
  legacyKey: string,
  canonicalKey: string,
  apply: boolean,
): Promise<Tally> {
  const tally: Tally = {
    target,
    cells: 0,
    rotated: 0,
    skipped: 0,
    hold: 0,
    ambiguous: 0,
    empty: 0,
    rolledBack: 0,
    holdLocators: [],
    ambiguousLocators: [],
  };
  let cells: Cell[];
  try {
    cells = await collect();
  } catch (e) {
    // 테이블이 아직 없는 환경(로컬 등)에서는 대상 없음으로 처리한다
    console.warn(`[rotation] ${target} 수집 실패 — 건너뜁니다: ${e instanceof Error ? e.message : e}`);
    return tally;
  }
  tally.cells = cells.length;
  for (const cell of cells) {
    const outcome = await rotateCell(cell, legacyKey, canonicalKey, apply);
    if (outcome === 'ROTATED') tally.rotated += 1;
    else if (outcome === 'SKIPPED_ALREADY_CANONICAL') tally.skipped += 1;
    else if (outcome === 'HOLD_UNREADABLE') {
      tally.hold += 1;
      tally.holdLocators.push(cell.locator);
    } else if (outcome === 'HOLD_AMBIGUOUS') {
      tally.ambiguous += 1;
      tally.ambiguousLocators.push(cell.locator);
    } else if (outcome === 'EMPTY') tally.empty += 1;
    else if (outcome === 'ROLLED_BACK') tally.rolledBack += 1;
  }
  return tally;
}

async function main(): Promise<void> {
  const { apply, legacyKey } = parseFlags(process.argv.slice(2));

  if (!isEncryptionKeyConfigured()) {
    console.error(
      'ENCRYPTION_KEY 가 canonical 조건(32바이트 이상 · 은퇴 기본 키 아님)을 만족하지 않습니다. 교체를 시작할 수 없습니다.',
    );
    process.exit(3);
  }
  const canonicalKey = process.env.ENCRYPTION_KEY as string;
  if (canonicalKey === legacyKey) {
    console.error('legacy 키와 canonical 키가 동일합니다 — 교체할 것이 없습니다.');
    process.exit(4);
  }

  await AppDataSource.initialize();
  try {
    const tallies: Tally[] = [];
    tallies.push(await runTarget('platform_store_payment_configs', collectPaymentConfigCells, legacyKey, canonicalKey, apply));
    tallies.push(await runTarget('settings.oauth_settings', collectOAuthSettingCells, legacyKey, canonicalKey, apply));
    tallies.push(await runTarget('cafe24_connections', collectCafe24Cells, legacyKey, canonicalKey, apply));

    const total = tallies.reduce(
      (acc, t) => ({
        cells: acc.cells + t.cells,
        rotated: acc.rotated + t.rotated,
        skipped: acc.skipped + t.skipped,
        hold: acc.hold + t.hold,
        ambiguous: acc.ambiguous + t.ambiguous,
        empty: acc.empty + t.empty,
        rolledBack: acc.rolledBack + t.rolledBack,
      }),
      { cells: 0, rotated: 0, skipped: 0, hold: 0, ambiguous: 0, empty: 0, rolledBack: 0 },
    );

    console.log(
      JSON.stringify(
        {
          wo: 'WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1',
          mode: apply ? 'APPLY' : 'DRY_RUN',
          byTarget: tallies,
          total,
        },
        null,
        2,
      ),
    );

    if (total.hold > 0) {
      console.warn(`\nHOLD ${total.hold}건 — legacy/canonical 어느 키로도 복호화되지 않았습니다. 임의 재생성하지 않았습니다.`);
    }
    if (total.ambiguous > 0) {
      console.warn(
        `
HOLD_AMBIGUOUS ${total.ambiguous}건 — legacy/canonical 양쪽으로 서로 다른 값이 읽혔습니다. ` +
          '어느 쪽이 진짜인지 단정할 수 없어 덮어쓰지 않았습니다. legacy 키 지정(--legacy-key-env)을 확인하십시오.',
      );
      process.exitCode = 6;
    }
    if (total.rolledBack > 0) {
      console.error(`\nROLLED_BACK ${total.rolledBack}건 — 검증 실패로 원래 값으로 되돌렸습니다.`);
      process.exitCode = 5;
    }
  } finally {
    await AppDataSource.destroy();
  }
}

// 직접 실행일 때만 동작한다 (테스트에서 import 해도 DB 에 붙지 않는다)
const invokedPath = (process.argv[1] || '').replace(/\\/g, '/');
if (/encryption-key-rotation\.(ts|js)$/.test(invokedPath)) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
