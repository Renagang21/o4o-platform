import { afterEach, expect, it } from 'vitest';
import {
  claimLoginNavigation,
  cancelLoginNavigation,
  consumeLoginNavigation,
} from '../loginNavigation';

afterEach(() => sessionStorage.clear());
it('explicit navigation suppresses the default redirect exactly once', () => {
  claimLoginNavigation();
  expect(consumeLoginNavigation()).toBe(true);
  expect(consumeLoginNavigation()).toBe(false);
});
it('failed login cancels suppression before the next login', () => {
  claimLoginNavigation();
  cancelLoginNavigation();
  expect(consumeLoginNavigation()).toBe(false);
});
