/**
 * 서비스 세션 세대(`session_epoch`) — 서비스 단위 로그아웃의 판정 축
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 시각이 아니라 세대인가
 *
 * JWT `iat` 는 **초 단위**다. 폐기 시각과 비교하면 두 가지가 동시에 깨진다:
 *
 *   · 로그아웃한 **같은 초에 다시 로그인**하면 새 토큰도 "폐기 이전" 으로 읽혀 거절된다
 *   · 같은 초의 **기존 토큰과 새 토큰을 구별할 수 없다** (둘의 `iat` 가 같다)
 *
 * 두 번째가 본질이다 — 초 단위 값으로는 같은 초 안의 선후를 알 수 없으므로 경계를 어느 쪽으로
 * 잡아도 한쪽이 틀린다. 그래서 **단조 증가하는 세대 번호**로 판정한다.
 *
 *   발급     그 시점의 epoch 를 토큰에 새긴다
 *   로그아웃  epoch += 1
 *   refresh  token.epoch < 현재 epoch  →  거절
 *
 * 시각을 전혀 보지 않으므로 같은 초·같은 밀리초에 일어난 일도 정확히 갈린다.
 *
 * SQL 을 이 파일 하나에 둔다 — 발급(로그인·handoff)·로그아웃·판정 세 곳이 같은 표를 만지므로
 * 흩어지면 한쪽만 바뀌어 어긋난다.
 */
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';

/** 행이 없는 (user, service) 의 세대. 아직 한 번도 로그아웃하지 않은 상태다. */
export const INITIAL_SESSION_EPOCH = 0;

function manager(m?: EntityManager): Pick<EntityManager, 'query'> {
  return m ?? AppDataSource.manager;
}

/**
 * 현재 세대. 행이 없으면 {@link INITIAL_SESSION_EPOCH}.
 *
 * 발급 시점에 읽어 토큰에 새긴다. `serviceKey` 를 모르면 새길 값도 없으므로 `null` 을 돌려준다
 * (claim 을 넣지 않는다 — 0 을 넣으면 "1세대 이전" 이라는 거짓 정보가 된다).
 */
export async function readServiceSessionEpoch(
  userId: string,
  serviceKey: string | null | undefined,
  m?: EntityManager,
): Promise<number | null> {
  if (!serviceKey) return null;
  const rows: Array<{ session_epoch: number }> = await manager(m).query(
    `SELECT session_epoch FROM service_session_revocations
      WHERE user_id = $1 AND service_key = $2
      LIMIT 1`,
    [userId, serviceKey],
  );
  return rows.length > 0 ? Number(rows[0].session_epoch) : INITIAL_SESSION_EPOCH;
}

/**
 * 그 서비스의 세대를 하나 올린다 = 지금까지 발급된 그 서비스 토큰을 모두 무효화한다.
 *
 * @returns 올린 뒤의 세대
 */
export async function bumpServiceSessionEpoch(
  userId: string,
  serviceKey: string,
  m?: EntityManager,
): Promise<number> {
  const rows: Array<{ session_epoch: number }> = await manager(m).query(
    `INSERT INTO service_session_revocations (user_id, service_key, session_epoch, revoked_at, updated_at)
     VALUES ($1, $2, 1, now(), now())
     ON CONFLICT (user_id, service_key)
     DO UPDATE SET session_epoch = service_session_revocations.session_epoch + 1,
                   revoked_at = now(),
                   updated_at = now()
     RETURNING session_epoch`,
    [userId, serviceKey],
  );
  return Number(rows[0].session_epoch);
}

/**
 * 이 토큰이 아직 살아 있는 세대인가.
 *
 * `tokenEpoch` 가 `null`/`undefined` = 이 변경 배포 **전에 발급된 토큰**이다. 어느 세션인지
 * 알 수 없으므로, 그 서비스에 폐기 기록이 하나라도 있으면 거절한다. 통과시키면 배포 직후
 * 최대 7일(refresh 수명) 동안 로그아웃이 무력해진다 — 종전(전역 폐기)과 같은 수준이므로
 * 보안이 후퇴하지 않고, 새 토큰부터는 세대로 정확히 갈린다.
 *
 * 폐기 기록이 아예 없으면(= 한 번도 로그아웃하지 않았다) claim 이 없어도 통과한다 —
 * 아무것도 끊지 않았는데 거절하면 배포만으로 전원이 로그아웃된다.
 */
export function isSessionEpochLive(tokenEpoch: number | null | undefined, currentEpoch: number): boolean {
  if (tokenEpoch === null || tokenEpoch === undefined) return currentEpoch <= INITIAL_SESSION_EPOCH;
  return tokenEpoch >= currentEpoch;
}
