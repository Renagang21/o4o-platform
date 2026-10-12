import {
  ServicePolicyLifecycleError,
  assertPolicyEffectiveForPublication,
  resolveServicePolicyLifecycle,
} from '../service-policy-lifecycle.js';

describe('service policy document lifecycle', () => {
  it('archives a draft', () => {
    expect(resolveServicePolicyLifecycle('draft', 'archive')).toBe('archived');
  });

  it('restores an archived document as draft', () => {
    expect(resolveServicePolicyLifecycle('archived', 'restore')).toBe('draft');
  });

  it.each([
    ['published', 'archive', 'PUBLISHED_POLICY_CANNOT_BE_ARCHIVED'],
    ['archived', 'archive', 'POLICY_ALREADY_ARCHIVED'],
    ['draft', 'restore', 'POLICY_NOT_ARCHIVED'],
    ['published', 'restore', 'POLICY_NOT_ARCHIVED'],
  ] as const)('rejects %s -> %s', (status, action, code) => {
    try {
      resolveServicePolicyLifecycle(status, action);
      throw new Error('expected lifecycle error');
    } catch (error) {
      expect(error).toBeInstanceOf(ServicePolicyLifecycleError);
      expect((error as ServicePolicyLifecycleError).code).toBe(code);
      expect((error as ServicePolicyLifecycleError).httpStatus).toBe(409);
    }
  });
});


describe('한국 달력 날짜의 시행일 게시 경계', () => {
  it('한국 시행일 직전 23:59:59에는 게시를 거부한다', () => {
    expect(() => assertPolicyEffectiveForPublication('2026-11-10', new Date('2026-11-09T14:59:59.999Z')))
      .toThrow(expect.objectContaining({ code: 'POLICY_NOT_YET_EFFECTIVE', httpStatus: 409 }));
  });
  it.each(['2026-11-09T15:00:00Z', '2026-11-09T23:59:59Z', '2026-11-10T14:59:59Z', '2026-11-10T15:00:00Z'])('%s: 한국 시행일 자정·당일 오전·다음날에는 게시 가능', instant => {
    expect(() => assertPolicyEffectiveForPublication(new Date('2026-11-10'), new Date(instant))).not.toThrow();
  });
  it('시행일 없는 legacy 계약은 유지한다', () => {
    expect(() => assertPolicyEffectiveForPublication(null, new Date('2026-11-09T14:59:59Z'))).not.toThrow();
  });
  it('유효하지 않은 시행일은 400이다', () => {
    expect(() => assertPolicyEffectiveForPublication('invalid-date')).toThrow(expect.objectContaining({ code: 'POLICY_EFFECTIVE_DATE_INVALID', httpStatus: 400 }));
  });
});
