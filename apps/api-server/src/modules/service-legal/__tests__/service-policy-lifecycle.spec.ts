import {
  ServicePolicyLifecycleError,
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
