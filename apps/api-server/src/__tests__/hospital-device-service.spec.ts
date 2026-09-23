/**
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §5·§6·§8·§9·§16
 *
 * hospital-device.service 결정론 테스트 — DB 없이 `Pick<DataSource,'query'>` mock 을 주입한다.
 * 검증 초점:
 *   · 순수 헬퍼(코드 생성 형식 · 정규화 · 해시 안정성)
 *   · createEnrollmentCode: 평문 코드는 응답에만, 저장은 **해시로만** (SQL 인자에 평문 코드 없음)
 *   · redeemEnrollmentCode: consumed_at IS NULL 원자적 claim 을 못 이기면 device 미생성
 *   · resolveActiveDevice: 해시로 조회, 짧은/빈 토큰은 DB 조회 없이 null
 *   · revokeDevice: RETURNING 행이 있어야 true
 */

import {
  generateEnrollmentCode,
  normalizeEnrollmentCode,
  hashSecret,
  generateDeviceToken,
  createEnrollmentCode,
  redeemEnrollmentCode,
  resolveActiveDevice,
  revokeDevice,
  HospitalEnrollmentError,
  HOSPITAL_SERVICE_KEY,
  type QueryExecutor,
} from '../services/hospital/hospital-device.service.js';

/** 순차 응답을 돌려주는 mock query — 각 호출의 (sql, params) 를 기록한다. */
function mockExecutor(responses: unknown[]): { ds: QueryExecutor; calls: { sql: string; params: unknown[] }[] } {
  const calls: { sql: string; params: unknown[] }[] = [];
  let i = 0;
  const ds: QueryExecutor = {
    query: (async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params: params ?? [] });
      const r = responses[i++];
      return r ?? [];
    }) as QueryExecutor['query'],
  };
  return { ds, calls };
}

describe('hospital-device pure helpers', () => {
  it('연결 코드는 "XXXX-XXXX" 형식이고 혼동 문자를 쓰지 않는다', () => {
    for (let n = 0; n < 50; n++) {
      const code = generateEnrollmentCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(code).not.toMatch(/[OIL01]/);
    }
  });

  it('정규화는 대문자화 + 하이픈/공백 제거', () => {
    expect(normalizeEnrollmentCode('h7k4-29px')).toBe('H7K429PX');
    expect(normalizeEnrollmentCode(' H7K4 29PX ')).toBe('H7K429PX');
  });

  it('hashSecret 는 안정적이고 64자 hex', () => {
    const h1 = hashSecret('H7K429PX');
    const h2 = hashSecret('H7K429PX');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecret('H7K429PX')).not.toBe(hashSecret('OTHER'));
  });

  it('device token 은 64자 hex(32 bytes) 이고 매번 다르다', () => {
    const a = generateDeviceToken();
    const b = generateDeviceToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe('createEnrollmentCode', () => {
  it('평문 코드는 응답에만, INSERT 인자에는 code_hash 만 들어간다', async () => {
    const { ds, calls } = mockExecutor([[{ id: 'code-1', expires_at: '2026-01-01T00:10:00Z' }]]);
    const created = await createEnrollmentCode(ds, { createdBy: 'admin-1', label: '3병동' });

    expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(created.id).toBe('code-1');
    expect(created.label).toBe('3병동');

    // 저장은 해시로만: params 에 평문 코드(정규형)가 없어야 한다.
    const insert = calls[0];
    const normalized = normalizeEnrollmentCode(created.code);
    expect(insert.params).not.toContain(created.code);
    expect(insert.params).not.toContain(normalized);
    expect(insert.params).toContain(hashSecret(normalized));
    expect(insert.params).toContain(HOSPITAL_SERVICE_KEY);
  });

  it('발급 실패(빈 RETURNING)면 CODE_ISSUE_FAILED', async () => {
    const { ds } = mockExecutor([[]]);
    await expect(createEnrollmentCode(ds, {})).rejects.toMatchObject({ code: 'CODE_ISSUE_FAILED' });
  });
});

describe('redeemEnrollmentCode', () => {
  it('claim UPDATE 를 이기면 device 를 만들고 토큰(평문)은 응답으로만 준다', async () => {
    const { ds, calls } = mockExecutor([
      [{ id: 'code-1', label: '3병동' }], // claim 성공
      [{ id: 'device-1' }], // device INSERT
      [], // consumed_device_id 업데이트
    ]);
    const result = await redeemEnrollmentCode(ds, { code: 'H7K4-29PX' });

    expect(result.deviceId).toBe('device-1');
    expect(result.deviceToken).toMatch(/^[0-9a-f]{64}$/);
    expect(result.label).toBe('3병동');

    // device INSERT 는 token_hash 만 저장한다(평문 토큰 아님).
    const insertDevice = calls[1];
    expect(insertDevice.params).toContain(hashSecret(result.deviceToken));
    expect(insertDevice.params).not.toContain(result.deviceToken);
  });

  it('claim UPDATE 가 0행(만료·사용·오코드)이면 CODE_NOT_REDEEMABLE 이고 device 를 만들지 않는다', async () => {
    const { ds, calls } = mockExecutor([[]]); // claim 실패
    await expect(redeemEnrollmentCode(ds, { code: 'H7K4-29PX' })).rejects.toMatchObject({
      code: 'CODE_NOT_REDEEMABLE',
    });
    expect(calls).toHaveLength(1); // INSERT device 로 넘어가지 않는다
  });

  it('너무 짧은 코드는 DB 조회 없이 CODE_INVALID', async () => {
    const { ds, calls } = mockExecutor([]);
    await expect(redeemEnrollmentCode(ds, { code: 'AB' })).rejects.toBeInstanceOf(HospitalEnrollmentError);
    expect(calls).toHaveLength(0);
  });
});

describe('resolveActiveDevice', () => {
  it('빈/짧은 토큰은 DB 조회 없이 null', async () => {
    const { ds, calls } = mockExecutor([]);
    expect(await resolveActiveDevice(ds, undefined)).toBeNull();
    expect(await resolveActiveDevice(ds, 'short')).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('활성 device 는 해시로 조회되고 last_seen 을 갱신한다', async () => {
    const token = generateDeviceToken();
    const row = { id: 'device-1', label: '3병동', status: 'active', createdAt: 't', lastSeenAt: 't', revokedAt: null };
    const { ds, calls } = mockExecutor([[row]]);
    const resolved = await resolveActiveDevice(ds, token);

    expect(resolved).toEqual(row);
    expect(calls[0].sql).toMatch(/last_seen_at/);
    expect(calls[0].params).toContain(hashSecret(token));
    expect(calls[0].params).toContain(HOSPITAL_SERVICE_KEY);
  });

  it('일치 device 가 없으면 null', async () => {
    const { ds } = mockExecutor([[]]);
    expect(await resolveActiveDevice(ds, generateDeviceToken())).toBeNull();
  });
});

describe('revokeDevice', () => {
  it('활성 device 를 해제하면 true', async () => {
    const { ds } = mockExecutor([[{ id: 'device-1' }]]);
    expect(await revokeDevice(ds, 'device-1')).toBe(true);
  });

  it('이미 해제/없는 device 면 false', async () => {
    const { ds } = mockExecutor([[]]);
    expect(await revokeDevice(ds, 'device-x')).toBe(false);
  });
});
