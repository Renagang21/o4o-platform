import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
const fixture = vi.hoisted(() => ({ roles: [] as string[], shell: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { roles: fixture.roles } }) }));
vi.mock('../hostProfile', () => ({ CURRENT_HOST_PROFILE: 'main' }));
vi.mock('../apiClient', () => ({ api: {} }));
vi.mock('../../components/NetureGlobalHeader', () => ({ NetureGlobalHeader: () => null }));
vi.mock('../../components/NetureBottomNav', () => ({ NetureBottomNav: () => null }));
vi.mock('../../components/layouts/CarePharmOperatorLayout', () => ({ default: () => null }));
vi.mock('@o4o/operator-ux-core', () => ({
  createOperatorServicesApi: () => ({}),
  OperatorAreaShell: (props: any) => { fixture.shell(props); return <div>{props.header}</div>; },
  OperatorServiceSwitcher: () => <span>service-switcher</span>,
}));
import OperatorLayoutWrapper from '../../components/layouts/OperatorLayoutWrapper';
import { NETURE_OPERATOR_DOMAIN_IA } from '../../config/operatorMenuGroups';
afterEach(() => { cleanup(); fixture.shell.mockClear(); });
describe('operator navigation preserves global Neture IA and scoped collaborator boundaries', () => {
  it('shows only business operations to a collaborator-only operator', () => {
    fixture.roles = ['neture:pharmacy_operator'];
    render(<OperatorLayoutWrapper />);
    const props = fixture.shell.mock.calls[0][0];
    expect(Object.values(props.menuItems).flat().map((item: any) => item.path)).toEqual(['/operator/semi-franchises']);
    expect(props.domainIAConfig).toBeUndefined();
    expect(screen.queryByText('service-switcher')).toBeNull();
  });
  it('preserves the full special Neture IA and service switcher for a Neture operator with an additional collaborator role', () => {
    fixture.roles = ['neture:operator','neture:pharmacy_operator'];
    render(<OperatorLayoutWrapper />);
    const props = fixture.shell.mock.calls[0][0];
    expect(props.domainIAConfig).toBe(NETURE_OPERATOR_DOMAIN_IA);
    expect(Object.values(props.menuItems).flat().map((item: any) => item.path)).toContain('/operator');
    expect(screen.getByText('service-switcher')).toBeTruthy();
  });
});
