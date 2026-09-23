/**
 * Hospital Pharmacy — Device Enrollment 서비스
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §5·§6·§8·§9·§16
 *
 * 병원약국은 개인 로그인 서비스가 아니다(공용 PC 로그인리스). 이 모듈은 신원과 연결 상태만
 * 다룬다: 관리자가 1회용 연결 코드를 발급 → 공용 PC 가 그 코드로 1회 device enrollment →
 * 이후 로그인 없이 device credential(HttpOnly 쿠키)로 hospital 범위 AI 를 쓴다.
 *
 * 저장 원칙:
 *   - 비밀값(enrollment code · device token)은 **SHA-256 해시로만** 저장한다. 평문은 없다.
 *   - device id/token 은 서버가 만든 random 값이다 — 하드웨어 fingerprint 파생 아님(§3).
 *   - 원내 데이터·환자정보·파일은 이 모듈이 만지지 않는다(§13 — 업무 컨텍스트는 브라우저).
 *
 * DB 는 raw SQL 로 접근한다(RETURNING gotcha 포함, store-tablet 선례). 테스트는
 * `Pick<DataSource,'query'>` 에 mock 을 주입해 결정론적으로 검증한다.
 */
import crypto from 'crypto';
import type { DataSource } from 'typeorm';

export const HOSPITAL_SERVICE_KEY = 'hospital-pharmacy' as const;

/** 연결 코드 기본 만료 — 짧게(§5). 추측 공격 창 최소화 + 발급 즉시 사용 UX. */
export const ENROLLMENT_CODE_TTL_MS = 10 * 60 * 1000;

/** 최소 query 인터페이스 — 테스트에서 mock 주입 가능. */
export type QueryExecutor = Pick<DataSource, 'query'>;

export interface CreatedEnrollmentCode {
  id: string;
  /** 평문 코드 — 응답으로 관리자에게 1회 보여줄 뿐, 저장은 해시로만. */
  code: string;
  label: string | null;
  expiresAt: string;
}

export interface RedeemResult {
  deviceId: string;
  /** 평문 device token — 쿠키로만 내려간다(저장은 해시). */
  deviceToken: string;
  label: string | null;
}

export interface HospitalDeviceRow {
  id: string;
  label: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface EnrollmentCodeStatusRow {
  id: string;
  label: string | null;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  /** 파생 상태 — 'consumed' | 'expired' | 'active'. */
  status: 'consumed' | 'expired' | 'active';
}

export class HospitalEnrollmentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'HospitalEnrollmentError';
  }
}

// ── 순수 헬퍼 (결정론 · 테스트 가능) ─────────────────────────────────────────

/** 혼동 문자(O/0/I/1/L) 를 뺀 코드 알파벳. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** "H7K4-29PX" 형태 — 4자 2그룹. 사용자가 읽고 입력하기 쉬운 최소 엔트로피. */
export function generateEnrollmentCode(): string {
  const pick = () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  const group = () => `${pick()}${pick()}${pick()}${pick()}`;
  return `${group()}-${group()}`;
}

/** 입력 코드를 해시 대상 정규형으로: 대문자 + 하이픈/공백 제거. */
export function normalizeEnrollmentCode(input: string): string {
  return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashSecret(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** TypeORM RETURNING 은 드라이버에 따라 [rows] 또는 rows 로 온다(store-tablet 선례). */
function unwrapRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return (Array.isArray(result[0]) ? result[0] : result) as T[];
  }
  return [];
}

// ── 관리자: 연결 코드 발급 (§9·§10) ─────────────────────────────────────────

export async function createEnrollmentCode(
  ds: QueryExecutor,
  opts: { createdBy?: string | null; label?: string | null; ttlMs?: number } = {},
): Promise<CreatedEnrollmentCode> {
  const code = generateEnrollmentCode();
  const codeHash = hashSecret(normalizeEnrollmentCode(code));
  const ttl = opts.ttlMs ?? ENROLLMENT_CODE_TTL_MS;
  const label = opts.label?.trim() ? opts.label.trim().slice(0, 80) : null;
  const createdBy = opts.createdBy ?? null;

  const rows = unwrapRows<{ id: string; expires_at: string }>(
    await ds.query(
      `INSERT INTO "hospital_device_enrollment_codes"
         ("service_key", "code_hash", "label", "created_by", "expires_at")
       VALUES ($1, $2, $3, $4, now() + ($5 || ' milliseconds')::interval)
       RETURNING "id", "expires_at"`,
      [HOSPITAL_SERVICE_KEY, codeHash, label, createdBy, String(ttl)],
    ),
  );
  const row = rows[0];
  if (!row) throw new HospitalEnrollmentError('연결 코드를 발급하지 못했습니다.', 'CODE_ISSUE_FAILED');
  return { id: row.id, code, label, expiresAt: row.expires_at };
}

// ── 공용 PC: 코드 사용 → device 발급 (§5·§8·§11) ─────────────────────────────

export async function redeemEnrollmentCode(
  ds: QueryExecutor,
  input: { code: string; label?: string | null },
): Promise<RedeemResult> {
  const normalized = normalizeEnrollmentCode(input.code);
  if (normalized.length < 6) {
    throw new HospitalEnrollmentError('연결 코드 형식이 올바르지 않습니다.', 'CODE_INVALID');
  }
  const codeHash = hashSecret(normalized);

  // 1회용 보장: consumed_at IS NULL + 미만료 조건의 원자적 UPDATE. 이겨야만 device 를 만든다.
  const claimed = unwrapRows<{ id: string; label: string | null }>(
    await ds.query(
      `UPDATE "hospital_device_enrollment_codes"
          SET "consumed_at" = now()
        WHERE "code_hash" = $1
          AND "consumed_at" IS NULL
          AND "expires_at" > now()
        RETURNING "id", "label"`,
      [codeHash],
    ),
  );
  const codeRow = claimed[0];
  if (!codeRow) {
    throw new HospitalEnrollmentError(
      '연결 코드가 유효하지 않거나 만료·사용되었습니다. 관리자에게 새 코드를 요청해 주세요.',
      'CODE_NOT_REDEEMABLE',
    );
  }

  const deviceToken = generateDeviceToken();
  const tokenHash = hashSecret(deviceToken);
  const label = input.label?.trim() ? input.label.trim().slice(0, 80) : codeRow.label ?? null;

  const created = unwrapRows<{ id: string }>(
    await ds.query(
      `INSERT INTO "hospital_devices"
         ("service_key", "label", "token_hash", "created_by")
       VALUES ($1, $2, $3, $4)
       RETURNING "id"`,
      [HOSPITAL_SERVICE_KEY, label, tokenHash, null],
    ),
  );
  const deviceId = created[0]?.id;
  if (!deviceId) {
    throw new HospitalEnrollmentError('이 PC 를 연결하지 못했습니다. 다시 시도해 주세요.', 'DEVICE_CREATE_FAILED');
  }

  // 감사: 코드 ↔ device 연결(값 원문 없음). 실패해도 device 는 유효하므로 조용히 무시한다.
  await ds
    .query(`UPDATE "hospital_device_enrollment_codes" SET "consumed_device_id" = $1 WHERE "id" = $2`, [
      deviceId,
      codeRow.id,
    ])
    .catch(() => undefined);

  return { deviceId, deviceToken, label };
}

// ── AI 게이트: device token → 활성 device 확인 (§6·§7) ────────────────────────

export async function resolveActiveDevice(
  ds: QueryExecutor,
  rawToken: string | undefined | null,
): Promise<HospitalDeviceRow | null> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16) return null;
  const tokenHash = hashSecret(rawToken);
  const rows = unwrapRows<HospitalDeviceRow & { token_hash?: string }>(
    await ds.query(
      `UPDATE "hospital_devices"
          SET "last_seen_at" = now()
        WHERE "token_hash" = $1
          AND "status" = 'active'
          AND "service_key" = $2
        RETURNING "id", "label", "status", "created_at" AS "createdAt",
                  "last_seen_at" AS "lastSeenAt", "revoked_at" AS "revokedAt"`,
      [tokenHash, HOSPITAL_SERVICE_KEY],
    ),
  );
  return rows[0] ?? null;
}

// ── 관리자: revoke (§16) ─────────────────────────────────────────────────────

export async function revokeDevice(ds: QueryExecutor, deviceId: string): Promise<boolean> {
  const rows = unwrapRows<{ id: string }>(
    await ds.query(
      `UPDATE "hospital_devices"
          SET "status" = 'revoked', "revoked_at" = now()
        WHERE "id" = $1
          AND "service_key" = $2
          AND "status" = 'active'
        RETURNING "id"`,
      [deviceId, HOSPITAL_SERVICE_KEY],
    ),
  );
  return rows.length > 0;
}

// ── 관리자: 목록 (§10) ───────────────────────────────────────────────────────

export async function listDevices(ds: QueryExecutor, opts: { limit?: number } = {}): Promise<HospitalDeviceRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return unwrapRows<HospitalDeviceRow>(
    await ds.query(
      `SELECT "id", "label", "status", "created_at" AS "createdAt",
              "last_seen_at" AS "lastSeenAt", "revoked_at" AS "revokedAt"
         FROM "hospital_devices"
        WHERE "service_key" = $1
        ORDER BY "created_at" DESC
        LIMIT $2`,
      [HOSPITAL_SERVICE_KEY, limit],
    ),
  );
}

export async function listEnrollmentCodes(
  ds: QueryExecutor,
  opts: { limit?: number } = {},
): Promise<EnrollmentCodeStatusRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const rows = unwrapRows<{
    id: string;
    label: string | null;
    createdAt: string;
    expiresAt: string;
    consumedAt: string | null;
    status: 'consumed' | 'expired' | 'active';
  }>(
    await ds.query(
      `SELECT "id", "label",
              "created_at" AS "createdAt",
              "expires_at" AS "expiresAt",
              "consumed_at" AS "consumedAt",
              CASE
                WHEN "consumed_at" IS NOT NULL THEN 'consumed'
                WHEN "expires_at" <= now() THEN 'expired'
                ELSE 'active'
              END AS "status"
         FROM "hospital_device_enrollment_codes"
        WHERE "service_key" = $1
        ORDER BY "created_at" DESC
        LIMIT $2`,
      [HOSPITAL_SERVICE_KEY, limit],
    ),
  );
  return rows;
}
