import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../../config/businessSite', () => ({ BUSINESS_SITE: { key: 'carepharm' } }));
const state = vi.hoisted(() => ({ key: 'carepharm', manage: true }));
vi.mock('../BusinessWorkspace', () => ({ useBusiness: () => ({ business: { key: state.key }, access: { canManage: state.manage } }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fixture-operator' } }), authClient: { api: {} } }));
vi.mock('@o4o/shared-space-ui', () => ({ HomePresentationEditor: (p: { surface: string; businessKey: string }) => <output>{p.surface}:{p.businessKey}</output> }));
import BusinessHomePresentationPage from '../BusinessHomePresentationPage';
import { pharmacyLegacyPath } from '../PharmacyLegacyRedirect';
afterEach(() => { cleanup(); state.manage = true; });
it.each([['carepharm', 'carepharm:carepharm'], ['pharmacy', 'pharmacy:pharmacy']])('keeps the existing publication surface for %s', (key, expected) => {
  state.key = key; render(<BusinessHomePresentationPage />); expect(screen.getByText(expected)).toBeTruthy();
});
it('does not mount the editor without current business management access', () => {
  state.key = 'carepharm'; state.manage = false; render(<BusinessHomePresentationPage />);
  expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByRole('status')).toBeNull();
});
it('routes old business editor and member entries back to the preserved CarePharm screens', () => {
  expect(pharmacyLegacyPath('/businesses/carepharm/home-presentation', 'carepharm')).toBe('/operator/home-presentation/carepharm');
  expect(pharmacyLegacyPath('/businesses/carepharm/materials', 'carepharm')).toBe('/materials');
});
