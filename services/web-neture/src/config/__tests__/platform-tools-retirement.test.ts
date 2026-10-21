import { describe, expect, it } from 'vitest';
import { getAdminMenu, UNIFIED_MENU } from '../operatorMenuGroups';

describe('retired platform tools', () => {
  it.each([false, true])('admin sidebar (platform=%s) does not advertise removed editors', platform => {
    const items = Object.values(getAdminMenu(platform)).flatMap(group => group ?? []);
    expect(items.some(item => item.path === '/admin/roles' || item.path === '/admin/settings/service-audience')).toBe(false);
    expect(items.some(item => item.path === '/admin/operators')).toBe(true);
  });
  it('service operator sidebar retains assignments without a role definition editor', () => {
    const items = Object.values(UNIFIED_MENU).flatMap(group => group ?? []);
    expect(items.some(item => item.path === '/admin/roles')).toBe(false);
  });
});
