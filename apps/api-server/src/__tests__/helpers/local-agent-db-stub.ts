/**
 * Local Work Agent 테스트용 in-memory DB stub
 *
 * WO-O4O-LOCAL-WORK-AGENT-V0 · WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1
 *
 * 파일 이름에 `.test.` / `.spec.` 이 없으므로 jest 가 이 파일을 **suite 로 수집하지 않는다.**
 * 두 spec (runtime · one-click pairing) 이 같은 stub 을 공유하기 위해 여기로 옮겼다.
 */

import {
  createPairingGrant,
  openAgentSession,
  recordHeartbeat,
  redeemPairingGrant,
} from '../../services/local-agent/local-agent-service.js';

export type LocalAgentDb = ReturnType<typeof makeDb>;

// ─── in-memory DB stub ───────────────────────────────────────────────────────

type Row = Record<string, any>;

/**
 * 4개 테이블만 흉내내는 최소 stub.
 *
 * 실제 SQL 을 파싱하지는 않는다 — 서비스가 내보내는 질의는 개수가 적고 고정되어 있으므로
 * 특징적인 조각으로 분기한다. 대신 **조건절의 의미는 그대로 구현한다**: `consumed_at IS NULL`,
 * `status IN ('pending','delivered')` 처럼 보안이 걸려 있는 조건은 여기서도 검사해야
 * replay·재사용 테스트가 진짜 검사가 된다.
 */
export function makeDb() {
  const pairings: Row[] = [];
  const devices: Row[] = [];
  const sessions: Row[] = [];
  const commands: Row[] = [];
  const sqlLog: string[] = [];

  const now = () => new Date().toISOString();

  /**
   * `RETURNING` 이 붙은 UPDATE 의 **프로덕션 반환 형태**.
   *
   * TypeORM(postgres) 은 이때 row 배열이 아니라 `[rows, affectedCount]` 를 준다.
   * stub 이 평범한 배열을 돌려주면 서비스가 그 형태를 오독해도 테스트는 통과해 버린다.
   * 실제로 그렇게 새어 나간 결함이 있었으므로(heartbeat 500 · 조건부 UPDATE 오독)
   * 여기서도 같은 형태로 돌려준다.
   */
  const returning = (rows: Row[]): any => [rows, rows.length];

  const query = async (sql: string, params: any[] = []): Promise<any> => {
    sqlLog.push(sql);
    const s = sql.replace(/\s+/g, ' ').trim();

    // ── pairings
    if (s.startsWith('UPDATE local_agent_pairings SET consumed_at = now() WHERE user_id')) {
      pairings.filter((p) => p.user_id === params[0] && !p.consumed_at).forEach((p) => {
        p.consumed_at = now();
      });
      return [];
    }
    if (s.startsWith('INSERT INTO local_agent_pairings')) {
      pairings.push({
        id: params[0],
        user_id: params[1],
        code_hash: params[2],
        expires_at: params[3],
        consumed_at: null,
      });
      return [];
    }
    if (s.includes('FROM local_agent_pairings') && s.includes('WHERE code_hash')) {
      const p = pairings.find((x) => x.code_hash === params[0]);
      return p ? [p] : [];
    }
    if (s.startsWith('UPDATE local_agent_pairings SET consumed_at = now() WHERE id')) {
      const p = pairings.find((x) => x.id === params[0] && !x.consumed_at);
      if (!p) return returning([]);
      p.consumed_at = now();
      return returning([{ id: p.id }]);
    }

    // ── devices
    if (s.startsWith('INSERT INTO local_agent_devices')) {
      devices.push({
        id: params[0],
        user_id: params[1],
        device_name: params[2],
        platform: params[3],
        agent_version: params[4],
        credential_hash: params[5],
        status: 'active',
        last_seen_at: null,
      });
      return [];
    }
    if (s.includes('FROM local_agent_devices WHERE id')) {
      const d = devices.find((x) => x.id === params[0]);
      return d ? [d] : [];
    }
    if (s.startsWith('UPDATE local_agent_devices SET last_seen_at')) {
      const d = devices.find((x) => x.id === params[0]);
      if (d) d.last_seen_at = now();
      return [];
    }
    if (s.includes('FROM local_agent_devices') && s.includes('WHERE user_id')) {
      return devices
        .filter((x) => x.user_id === params[0] && x.status === 'active')
        .sort((a, b) => String(b.last_seen_at ?? '').localeCompare(String(a.last_seen_at ?? '')));
    }

    // ── sessions
    if (s.startsWith('INSERT INTO local_agent_sessions')) {
      sessions.push({
        id: params[0],
        device_id: params[1],
        token_hash: params[2],
        expires_at: params[3],
        ended_at: null,
      });
      return [];
    }
    if (s.includes('FROM local_agent_sessions s')) {
      const sess = sessions.find(
        (x) =>
          x.token_hash === params[0] &&
          !x.ended_at &&
          new Date(x.expires_at).getTime() > Date.now(),
      );
      if (!sess) return [];
      const d = devices.find((x) => x.id === sess.device_id && x.status === 'active');
      if (!d) return [];
      return [{ session_id: sess.id, device_id: d.id, user_id: d.user_id }];
    }

    // ── commands
    if (s.startsWith('INSERT INTO local_agent_commands')) {
      commands.push({
        command_id: params[0],
        device_id: params[1],
        user_id: params[2],
        tool_name: params[3],
        action: params[4],
        status: 'pending',
        issued_at: params[5],
        expires_at: params[6],
        error_code: null,
        result_data: null,
        completed_at: null,
      });
      return [];
    }
    if (s.startsWith('UPDATE local_agent_commands SET status = \'delivered\'')) {
      const picked = commands
        .filter(
          (c) =>
            c.device_id === params[0] &&
            c.status === 'pending' &&
            new Date(c.expires_at).getTime() > Date.now(),
        )
        .slice(0, params[1]);
      picked.forEach((c) => {
        c.status = 'delivered';
      });
      return returning(
        picked.map((c) => ({
          command_id: c.command_id,
          action: c.action,
          issued_at: c.issued_at,
          expires_at: c.expires_at,
        })),
      );
    }
    if (s.includes('FROM local_agent_commands') && s.includes('AND device_id')) {
      const c = commands.find((x) => x.command_id === params[0] && x.device_id === params[1]);
      return c ? [c] : [];
    }
    if (s.startsWith('SELECT status, error_code, result_data FROM local_agent_commands')) {
      const c = commands.find((x) => x.command_id === params[0]);
      // 사본을 돌려준다. 실제 Postgres 도 그러하며,
      // 호출자가 직후 result_data 를 NULL 로 지우는 것(§37)이
      // 방금 읽은 row 까지 비우면 테스트가 엉뚱한 것을 본다.
      return c ? [{ ...c }] : [];
    }
    if (s.startsWith('UPDATE local_agent_commands SET result_data = NULL')) {
      const c = commands.find((x) => x.command_id === params[0]);
      if (c) c.result_data = null;
      return [];
    }
    if (s.includes("SET status = 'expired'")) {
      const c = commands.find(
        (x) =>
          x.command_id === params[0] && (x.status === 'pending' || x.status === 'delivered'),
      );
      if (!c) return [];
      c.status = 'expired';
      c.error_code = params[1];
      c.completed_at = now();
      return [{ command_id: c.command_id }];
    }
    if (s.startsWith('UPDATE local_agent_commands SET status = $2')) {
      const c = commands.find(
        (x) =>
          x.command_id === params[0] && (x.status === 'pending' || x.status === 'delivered'),
      );
      if (!c) return returning([]);
      c.status = params[1];
      c.error_code = params[2];
      c.result_data = params[3];
      c.completed_at = now();
      return returning([{ command_id: c.command_id }]);
    }

    throw new Error(`stub 이 모르는 SQL: ${s.slice(0, 90)}`);
  };

  const dataSource: any = { query: jest.fn(query) };
  return { dataSource, pairings, devices, sessions, commands, sqlLog };
}

export const REGISTER = {
  deviceName: '약국 PC',
  platform: 'windows',
  agentVersion: '0.1.0',
};

export async function pairAndRegister(db: LocalAgentDb, userId = 'user-1') {
  const { grant } = await createPairingGrant(db.dataSource, userId);
  const outcome = await redeemPairingGrant(db.dataSource, { grant, ...REGISTER });
  if (outcome.ok === false) throw new Error(`연결 실패: ${outcome.reason}`);
  if (outcome.status !== 'connected') throw new Error('새 device 가 등록되지 않았다');
  return { grant, deviceId: outcome.deviceId, agentCredential: outcome.agentCredential };
}

export async function connected(db: LocalAgentDb, userId = 'user-1') {
  const reg = await pairAndRegister(db, userId);
  const session = await openAgentSession(db.dataSource, reg.deviceId, reg.agentCredential);
  if (session.ok === false) throw new Error('세션 실패');
  await recordHeartbeat(db.dataSource, reg.deviceId);
  return { ...reg, sessionToken: session.sessionToken };
}

