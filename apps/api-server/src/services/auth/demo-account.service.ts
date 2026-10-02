/**
 * Demo 계정 판정 — **정본은 `demo_accounts.user_id` 하나다**
 *
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 Phase C
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 모듈이 있나
 *
 *   Demo 계정은 **공개 credential** 을 쓴다(비밀번호가 문서에 적혀 있다). 그래서 비밀번호를
 *   아는 사람이 `POST /auth/password` 로 그 비밀번호를 **바꿔 버릴 수 있다** — 그러면 공개
 *   체험 계정이 한 사람에게 사유화된다. 화면에서 버튼을 숨기는 것으로는 막히지 않는다.
 *
 *   판정을 이메일 문자열로 하지 않는다. `if (email === 'teststoreowner@example.com')` 이
 *   퍼지면 몇 달 뒤 어디를 고쳐야 하는지 알 수 없다. 그래서 registry 한 곳만 본다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 설계
 *
 *   `isDemoAccount(userId)` 는 **DB 오류를 통과로 바꾸지 않는다** — 조회가 실패하면 예외를
 *   그대로 던진다. 보호 대상 여부를 모르는 채로 "Demo 가 아니다" 로 진행하면 보호가 사라진다
 *   (fail-closed).
 *
 *   일반 사용자 동작은 불변이다. 이 모듈은 `demo_accounts` 에 행이 있는 사용자에게만 반응한다.
 */
import type { EntityManager } from 'typeorm';

type Queryable = Pick<EntityManager, 'query'>;

export type DemoAccountType = 'STORE_OWNER' | 'SUPPLIER';

/** Demo 계정이 막는 동작 — 호출부가 사유를 그대로 응답에 쓴다. */
export const DEMO_ACCOUNT_FORBIDDEN_CODE = 'DEMO_ACCOUNT_FORBIDDEN';
export const DEMO_ACCOUNT_FORBIDDEN_MESSAGE =
  '테스트 계정에서는 사용할 수 없는 기능입니다. 계정 정보·인증 수단은 고정되어 있습니다.';

/**
 * 서비스 계층에서 Demo 대상을 만나면 던진다 — 호출 controller 가 `sendDemoAccountForbidden` 으로 403 에 싣는다.
 * (대상 userId 가 서비스 안에서야 드러나는 경로: membershipId · supplierId · caseId 등.)
 */
export class DemoAccountForbiddenError extends Error {
  readonly statusCode = 403;
  readonly code = DEMO_ACCOUNT_FORBIDDEN_CODE;
  constructor() {
    super(DEMO_ACCOUNT_FORBIDDEN_MESSAGE);
    this.name = 'DemoAccountForbiddenError';
  }
}

type JsonResponse = { status(code: number): { json(body: unknown): unknown } };

/** 403 응답 한 벌 — 문구 · 코드 복제 0. */
export function respondDemoAccountForbidden(res: JsonResponse): void {
  res.status(403).json({ success: false, error: DEMO_ACCOUNT_FORBIDDEN_MESSAGE, code: DEMO_ACCOUNT_FORBIDDEN_CODE });
}

/** catch 블록용: Demo 거절이면 403 을 쓰고 true. */
export function sendDemoAccountForbidden(res: JsonResponse, error: unknown): boolean {
  if (!(error instanceof DemoAccountForbiddenError)) return false;
  respondDemoAccountForbidden(res);
  return true;
}

class DemoAccountService {
  private async resolveDb(manager?: Queryable): Promise<Queryable> {
    if (manager) return manager;
    // 기본 연결은 필요할 때만 끌어온다(entity 를 싣지 않는 CLI 가 이 모듈을 쓸 수 있게).
    const { AppDataSource } = await import('../../database/connection.js');
    return AppDataSource;
  }

  /** 활성 Demo 계정인가. 비활성(`is_active=false`) 기록은 보호 대상이 아니다. */
  async isDemoAccount(userId: string | null | undefined, manager?: Queryable): Promise<boolean> {
    if (!userId) return false;
    const rows: unknown[] = await (await this.resolveDb(manager)).query(
      `SELECT 1 FROM demo_accounts WHERE user_id = $1 AND is_active`,
      [userId],
    );
    return rows.length > 0;
  }

  /** Demo 이면 `DemoAccountForbiddenError` — write **전에** 부른다. 조회 실패는 그대로 올린다(fail-closed). */
  async assertNotDemoAccount(userId: string | null | undefined, manager?: Queryable): Promise<void> {
    if (await this.isDemoAccount(userId, manager)) throw new DemoAccountForbiddenError();
  }

  /**
   * 조직의 owner 가 활성 Demo 계정인가 — 대상이 조직 id 로만 들어오는 경로용(공급자 비활성화 등).
   * 판정 정본은 여전히 `demo_accounts.user_id` 다(owner 행을 거쳐 본다).
   */
  async isDemoOrganization(organizationId: string | null | undefined, manager?: Queryable): Promise<boolean> {
    if (!organizationId) return false;
    const rows: unknown[] = await (await this.resolveDb(manager)).query(
      `SELECT 1
         FROM demo_accounts d
         JOIN organization_members m ON m.user_id = d.user_id
        WHERE d.is_active AND m.organization_id = $1 AND m.role = 'owner' AND m.left_at IS NULL`,
      [organizationId],
    );
    return rows.length > 0;
  }

  /** 유형(배지 · 안내 문구용). Demo 가 아니면 null. */
  async getDemoAccountType(
    userId: string | null | undefined,
    manager?: Queryable,
  ): Promise<DemoAccountType | null> {
    if (!userId) return null;
    const rows: Array<{ demo_type: DemoAccountType }> = await (await this.resolveDb(manager)).query(
      `SELECT demo_type FROM demo_accounts WHERE user_id = $1 AND is_active`,
      [userId],
    );
    return rows[0]?.demo_type ?? null;
  }

  /**
   * 이메일로 Demo 여부를 본다 — **아직 로그인하지 않은 경로 전용**
   * (`/auth/password/forgot` 은 사용자를 특정하기 전에 이메일만 받는다).
   * 이메일 문자열을 **상수와 비교하지 않는다**: `users` 를 거쳐 `demo_accounts` 를 확인하므로
   * 판정 정본은 여전히 `user_id` 다.
   */
  async isDemoLoginEmail(normalizedEmail: string, manager?: Queryable): Promise<boolean> {
    if (!normalizedEmail) return false;
    const rows: unknown[] = await (await this.resolveDb(manager)).query(
      `SELECT 1
         FROM demo_accounts d
         JOIN users u ON u.id = d.user_id
        WHERE d.is_active AND lower(u.email) = $1`,
      [normalizedEmail],
    );
    return rows.length > 0;
  }
}

export const demoAccountService = new DemoAccountService();

/**
 * controller 용: 대상이 활성 Demo 계정이면 403 을 쓰고 true — write **전에** 부른다.
 * 조회 실패는 그대로 올린다(fail-closed · 호출부 catch 가 500).
 */
export async function rejectDemoAccountTarget(res: JsonResponse, userId: string | null | undefined): Promise<boolean> {
  if (!(await demoAccountService.isDemoAccount(userId))) return false;
  respondDemoAccountForbidden(res);
  return true;
}
