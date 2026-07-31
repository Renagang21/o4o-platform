/**
 * WO-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1
 *
 * 관리자 사용자 응답에서 인증 관련 민감 필드의 **key 자체가 제거**되는지 검증한다.
 * (값을 null 로 가리는 것이 아니라 key 부재여야 한다.)
 */
import { getMetadataArgsStorage } from 'typeorm';
import { User } from '../../../modules/auth/entities/User.js';
import {
  ADMIN_USER_SENSITIVE_FIELDS,
  sanitizeAdminUser,
  sanitizeAdminUsers,
} from '../admin-user-sanitizer.js';

/** 실제 사용자 응답과 같은 모양의 픽스처 (값은 더미) */
const fixture = () => ({
  id: 'u-1',
  email: 'someone@example.com',
  name: '테스트',
  phone: '010-0000-0000',
  status: 'active',
  isActive: true,
  businessInfo: { businessName: '테스트약국' },
  lastLoginAt: '2026-07-31T00:00:00.000Z',
  lastLoginIp: '127.0.0.1',
  loginAttempts: 0,
  lockedUntil: null,
  approvedAt: '2026-07-01T00:00:00.000Z',
  approvedBy: 'admin-1',
  provider: 'local',
  provider_id: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-31T00:00:00.000Z',
  // 민감 필드
  password: '$2b$10$dummyhash',
  refreshTokenFamily: 'fam-uuid',
  resetPasswordToken: 'reset-token',
  resetPasswordExpires: '2026-08-01T00:00:00.000Z',
});

describe('sanitizeAdminUser — 민감 필드 제거', () => {
  it('password 와 refreshTokenFamily 의 key 자체를 제거한다', () => {
    const out = sanitizeAdminUser(fixture()) as Record<string, unknown>;
    expect('password' in out).toBe(false);
    expect('refreshTokenFamily' in out).toBe(false);
  });

  it('비밀번호 재설정 토큰과 만료값도 제거한다', () => {
    const out = sanitizeAdminUser(fixture()) as Record<string, unknown>;
    expect('resetPasswordToken' in out).toBe(false);
    expect('resetPasswordExpires' in out).toBe(false);
  });

  it('값이 null/undefined 여도 key 를 남기지 않는다', () => {
    const out = sanitizeAdminUser({
      id: 'u-2',
      password: null,
      refreshTokenFamily: undefined,
      resetPasswordToken: null,
      resetPasswordExpires: undefined,
    }) as Record<string, unknown>;
    for (const f of ADMIN_USER_SENSITIVE_FIELDS) {
      expect(f in out).toBe(false);
    }
    expect(out.id).toBe('u-2');
  });

  it('관리자 기능이 쓰는 일반 필드는 유지한다', () => {
    const out = sanitizeAdminUser(fixture()) as Record<string, unknown>;
    for (const keep of [
      'id', 'email', 'name', 'phone', 'status', 'isActive',
      'businessInfo', 'lastLoginAt', 'loginAttempts', 'lockedUntil',
      'approvedAt', 'approvedBy', 'createdAt', 'updatedAt',
    ]) {
      expect(out).toHaveProperty(keep);
    }
  });

  it('입력 객체를 변형하지 않는다 (shallow copy 반환)', () => {
    const input = fixture();
    const before = Object.keys(input).length;
    const out = sanitizeAdminUser(input);
    expect(Object.keys(input)).toHaveLength(before);
    expect((input as Record<string, unknown>).password).toBeDefined();
    expect((input as Record<string, unknown>).refreshTokenFamily).toBeDefined();
    expect(out).not.toBe(input);
  });

  it('민감 필드가 애초에 없어도 안전하게 동작한다', () => {
    const out = sanitizeAdminUser({ id: 'u-3', email: 'a@b.c' }) as Record<string, unknown>;
    expect(out).toEqual({ id: 'u-3', email: 'a@b.c' });
  });
});

describe('sanitizeAdminUsers — 목록 전체 적용', () => {
  it('배열의 모든 항목에 동일하게 적용한다', () => {
    const list = [fixture(), fixture(), fixture()];
    const out = sanitizeAdminUsers(list) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(3);
    for (const row of out) {
      for (const f of ADMIN_USER_SENSITIVE_FIELDS) {
        expect(f in row).toBe(false);
      }
      expect(row.id).toBe('u-1');
    }
  });

  it('빈 배열도 처리한다', () => {
    expect(sanitizeAdminUsers([])).toEqual([]);
  });

  it('원본 배열과 항목을 변형하지 않는다', () => {
    const list = [fixture()];
    sanitizeAdminUsers(list);
    expect((list[0] as Record<string, unknown>).refreshTokenFamily).toBeDefined();
  });
});

describe('민감 필드 목록 자체 검증', () => {
  it('모든 민감 필드가 User 엔티티의 실제 컬럼이다 (오탈자 방지)', () => {
    const storage = getMetadataArgsStorage();
    const columns = new Set(
      storage.columns
        .filter((c) => c.target === User || (typeof c.target === 'function' && User.prototype instanceof c.target))
        .map((c) => c.propertyName),
    );
    expect(columns.size).toBeGreaterThan(0);
    const unmapped = ADMIN_USER_SENSITIVE_FIELDS.filter((f) => !columns.has(f));
    expect(unmapped).toEqual([]);
  });

  it('목록·단건이 같은 계약을 쓰도록 단일 SSOT 를 제공한다', () => {
    const one = sanitizeAdminUser(fixture()) as Record<string, unknown>;
    const [fromList] = sanitizeAdminUsers([fixture()]) as Array<Record<string, unknown>>;
    expect(Object.keys(one).sort()).toEqual(Object.keys(fromList).sort());
  });
});
