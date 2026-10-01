/**
 * 비밀번호 수단 저장소 — `user_password_credentials` 의 **유일한** 읽기·쓰기 경로
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2 · §2-2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 단방향 해시는 여기서만 한다
 *
 *   `chk_upc_hash_len` 은 해시 길이 **하한 검사**일 뿐 평문 저장을 막지 못한다. 평문이 DB 에
 *   가지 않는다는 보장은 이 파일이다: 저장 함수(`setPassword`)는 인자로 받은 원문을 bcrypt 로
 *   해시한 값만 쓰고, 원문을 반환·기록하지 않는다. 검증은 `bcrypt.compare` 로만 한다.
 *   (테스트: `__tests__/passwordCredentialService.test.ts` — 저장값 ≠ 원문 · `$2` 형식 · compare)
 *
 *   bcryptjs 는 기존 의존성이다(새 의존성 0). 원문의 대소문자·공백을 변형하지 않는다.
 *   bcrypt 는 입력 72바이트까지만 본다 — 조용히 잘라 쓰지 않도록 정책(UTF-8 72바이트 상한)과 별개로
 *   저장(`setPassword` = 거절) · 검증(`verifyPassword` = 불일치) 경로에서도 같은 상한을 다시 검사한다.
 *
 * 옛 `service_credentials`(서비스별 password 축)의 부활이 아니다: 계정(`users.id`)당 1행이다.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { EntityManager } from 'typeorm';
import { isPasswordWithinByteLimit } from '@o4o/auth-utils';
import { AppDataSource } from '../../database/connection.js';

/** bcrypt cost. 운영 Cloud Run 1 vCPU 에서 1회 ≈ 수백 ms — 로그인 횟수 제한과 함께 쓴다. */
export const PASSWORD_HASH_COST = 12;
export const PASSWORD_HASH_ALGO = 'bcrypt';

/**
 * 계정 없음과 비밀번호 틀림의 **응답 시간 차이**를 줄이기 위한 고정 해시.
 * 어떤 비밀번호와도 일치하지 않는 임의 문자열의 해시다(원문은 코드에 없다).
 */
const TIMING_DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('base64url'), PASSWORD_HASH_COST);

type Queryable = Pick<EntityManager, 'query'>;

/** 72바이트를 넘는 원문을 저장하려 할 때 — 호출부 정책 검사를 건너뛴 경우의 최후 방어. */
export class PasswordTooLongError extends Error {
  constructor() {
    super('password exceeds bcrypt 72-byte input limit');
    this.name = 'PasswordTooLongError';
  }
}

class PasswordCredentialService {
  private db(manager?: Queryable): Queryable {
    return manager ?? AppDataSource;
  }

  /** 수단 보유 여부 — 행 존재 = 비밀번호 수단을 가졌다 */
  async hasPassword(userId: string, manager?: Queryable): Promise<boolean> {
    const rows: unknown[] = await this.db(manager).query(
      `SELECT 1 FROM user_password_credentials WHERE user_id = $1`,
      [userId],
    );
    return rows.length > 0;
  }

  /**
   * 비밀번호 설정(최초·변경·재설정 공용). 원문을 해시해 **해시만** 저장한다.
   * 정책 검사는 호출부 책임이다(`checkPasswordPolicy` — 화면과 같은 함수).
   */
  async setPassword(userId: string, plain: string, manager?: Queryable): Promise<void> {
    if (!isPasswordWithinByteLimit(plain)) throw new PasswordTooLongError();
    const hash = await bcrypt.hash(plain, PASSWORD_HASH_COST);
    await this.db(manager).query(
      `INSERT INTO user_password_credentials (user_id, password_hash, algo, password_changed_at, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now(), now())
       ON CONFLICT (user_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             algo = EXCLUDED.algo,
             password_changed_at = now(),
             updated_at = now()`,
      [userId, hash, PASSWORD_HASH_ALGO],
    );
  }

  /**
   * 원문이 저장된 해시와 일치하는가. 수단이 없거나 원문이 72바이트를 넘으면 false.
   * 수단이 없어도 같은 비용의 compare 를 한 번 수행한다(시간 차이로 수단 보유를 드러내지 않는다).
   */
  async verifyPassword(userId: string | null, plain: string): Promise<boolean> {
    let hash: string | null = null;
    if (userId) {
      const rows: Array<{ password_hash: string }> = await AppDataSource.query(
        `SELECT password_hash FROM user_password_credentials WHERE user_id = $1`,
        [userId],
      );
      hash = rows[0]?.password_hash ?? null;
    }
    // 72바이트 초과 원문은 저장될 수 없으므로 어떤 해시와도 일치하지 않는다 — 잘린 앞부분으로 인증하지 않는다.
    // 같은 비용의 compare 는 그대로 한 번 수행한다(길이는 공격자가 아는 값이지만 분기 비용을 맞춘다).
    if (!isPasswordWithinByteLimit(plain)) hash = null;
    if (!hash) {
      await bcrypt.compare(plain, TIMING_DUMMY_HASH);
      return false;
    }
    return bcrypt.compare(plain, hash);
  }
}

export const passwordCredentialService = new PasswordCredentialService();
