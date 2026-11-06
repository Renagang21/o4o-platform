import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ServiceBrandIdentity, resolveServiceBrand } from '../ServiceBrandIdentity';
vi.mock('../../lib/hostProfile', () => ({ CURRENT_HOST_PROFILE: 'main' }));
beforeEach(() => {
  const link=document.createElement('link');link.id='o4o-service-icon';link.rel='icon';link.href='/favicon.svg';document.head.append(link);
});
afterEach(()=>{cleanup();for(const id of ['o4o-service-icon','o4o-service-ico','o4o-service-touch'])document.getElementById(id)?.remove();});
describe('O4O main and service tab identities',()=>{
  it('keeps the main home unbadged and restores it after SPA navigation',()=>{
    function Navigation(){const navigate=useNavigate();return <><ServiceBrandIdentity/><button onClick={()=>navigate('/mypage')}>서비스</button><button onClick={()=>navigate('/')}>대표 홈</button></>;}
    const view=render(<MemoryRouter><Navigation/></MemoryRouter>);
    expect(document.querySelector('#o4o-service-icon')?.getAttribute('href')).toBe('/favicon.svg');
    expect(document.getElementById('o4o-service-ico')).toBeNull();
    fireEvent.click(view.getByText('서비스'));
    expect(document.querySelector('#o4o-service-icon')?.getAttribute('href')).toBe('/brand/neture/favicon.svg');
    expect(document.querySelector('#o4o-service-ico')?.getAttribute('href')).toBe('/brand/neture/favicon.ico');
    fireEvent.click(view.getByText('대표 홈'));
    expect(document.querySelector('#o4o-service-icon')?.getAttribute('href')).toBe('/favicon.svg');
    expect(document.getElementById('o4o-service-ico')).toBeNull();
  });
  it('keeps each independent host identity on home and account pages',()=>{
    for(const profile of ['supplier','funding','community','carepharm'] as const){
      expect(resolveServiceBrand(profile,'/')).toBe(profile);
      expect(resolveServiceBrand(profile,'/login')).toBe(profile);
    }
  });
});
