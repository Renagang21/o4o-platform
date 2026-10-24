import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
const state=vi.hoisted(()=>({profile:'carepharm'}));
vi.mock('../lib/hostProfile',()=>({get CURRENT_HOST_PROFILE(){return state.profile;}}));
vi.mock('../lib/apiClient',()=>({api:{}}));
vi.mock('@o4o/shared-space-ui',()=>({ScopedContactForm:({endpoint}:{endpoint:string})=><div data-testid="scoped">{endpoint}</div>}));
vi.mock('./ContactPage',()=>({default:()=><div>Canonical service contact</div>}));
import ScopedContactPage from './ScopedContactPage';
afterEach(cleanup);
it('sends CarePharm contact into the same business scope as its operator inbox',()=>{
 state.profile='carepharm';render(<ScopedContactPage/>);
 expect(screen.getByTestId('scoped').textContent).toBe('/operator-inbox/business/carepharm');
});
it.each(['main','supplier','funding','community'])('preserves canonical contact settings and delivery for %s',profile=>{
 state.profile=profile;render(<ScopedContactPage/>);
 expect(screen.getByText('Canonical service contact')).toBeTruthy();expect(screen.queryByTestId('scoped')).toBeNull();
});
