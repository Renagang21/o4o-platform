import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { HostProfile } from '../../lib/hostProfile';

const host = vi.hoisted(() => ({ profile: 'main' as HostProfile }));
vi.mock('../../lib/hostProfile', () => ({ get CURRENT_HOST_PROFILE() { return host.profile; } }));

import { NetureUserMenuItems } from '../NetureUserMenu';

const paths = {
  supplier: '/operator/suppliers',
  funding: '/operator/market-trial',
  community: '/operator/communities',
} as const;
type ScopedHost = keyof typeof paths;

function user(roles: string[], service = host.profile as string, status = 'active') {
  return { id: 'synthetic-user', roles, memberships: service ? [{ serviceKey: service, status }] : [] };
}

function menu(viewer: ReturnType<typeof user>, authenticated = true) {
  return render(<MemoryRouter><NetureUserMenuItems user={viewer} isAuthenticated={authenticated} /></MemoryRouter>);
}

function operatorLinks() {
  return screen.queryAllByRole('link').map(link => link.getAttribute('href'))
    .filter(href => href?.startsWith('/operator') || href?.startsWith('/admin'));
}

afterEach(() => { cleanup(); host.profile = 'main'; });

describe('service operator profile entry matches assigned service and route', () => {
  it.each(Object.keys(paths) as ScopedHost[])('%s operator reaches that service, without Neture dashboard entries', profile => {
    host.profile = profile;
    menu(user([`${profile}:operator`]));
    expect(operatorLinks()).toEqual([paths[profile]]);
  });

  it.each(Object.keys(paths) as ScopedHost[])('%s does not expose Neture-only or another service role', profile => {
    host.profile = profile;
    menu(user(['neture:admin', 'neture:operator', 'lecture:operator']));
    expect(operatorLinks()).toEqual([]);
  });

  it.each(['pending', 'suspended', 'rejected', 'withdrawn', 'missing'])('supplier %s membership has no protected entry', status => {
    host.profile = 'supplier';
    menu(user(['supplier:operator'], status === 'missing' ? '' : 'supplier', status));
    expect(operatorLinks()).toEqual([]);
  });

  it('supplier admin has supplier administration and operation entries', () => {
    host.profile = 'supplier';
    menu(user(['supplier:admin']));
    expect(operatorLinks()).toEqual(['/admin/supplier-governance', '/operator/suppliers']);
  });

  it('community admin has community administration and operation entries', () => {
    host.profile = 'community';
    menu(user(['community:admin']));
    expect(operatorLinks()).toEqual(['/admin/communities', '/operator/communities']);
  });

  it('funding admin uses the existing funding operator landing, without an invented admin route', () => {
    host.profile = 'funding';
    menu(user(['funding:admin']));
    expect(operatorLinks()).toEqual(['/operator/market-trial']);
  });

  it('removes the entry after a refreshed assignment revocation', () => {
    host.profile = 'supplier';
    const view = menu(user(['supplier:operator']));
    expect(operatorLinks()).toEqual(['/operator/suppliers']);
    view.rerender(<MemoryRouter><NetureUserMenuItems user={user([])} isAuthenticated /></MemoryRouter>);
    expect(operatorLinks()).toEqual([]);
  });

  it.each(['supplier', 'funding'] as ScopedHost[])('preserves full administrator route bypass for %s', profile => {
    host.profile = profile;
    menu(user(['platform:super_admin'], ''));
    expect(operatorLinks()).toContain(paths[profile]);
    expect(operatorLinks()).not.toContain('/operator');
    expect(operatorLinks()).not.toContain('/admin');
  });

  it('ignores stale roles when the session is unauthenticated', () => {
    host.profile = 'supplier';
    menu(user(['platform:super_admin']), false);
    expect(operatorLinks()).toEqual([]);
  });

  it('preserves representative Neture dashboard routes', () => {
    menu(user(['neture:admin']));
    expect(operatorLinks()).toEqual(['/admin', '/operator']);
  });

  it('preserves the community landing host contract without inventing a service role', () => {
    host.profile = 'carepharm';
    menu(user(['neture:admin']));
    expect(operatorLinks()).toEqual(['/admin', '/operator']);
  });

  it('does not grant representative entries to an ordinary community landing account', () => {
    host.profile = 'carepharm';
    menu(user([]));
    expect(operatorLinks()).toEqual([]);
  });
});

it('community profile entry requires an explicit community assignment', () => {
  host.profile = 'community';
  menu(user(['platform:super_admin'], ''));
  expect(operatorLinks()).toEqual([]);
});
