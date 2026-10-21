import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state=vi.hoisted(()=>({user:null as any,isAuthenticated:false}));
vi.mock('../../contexts/AuthContext',()=>({useAuth:()=>state}));
vi.mock('../../lib/apiClient',()=>({api:{get:vi.fn(async()=>({data:{data:null}}))}}));
vi.mock('../../components/auth/ServiceApplyPanel',()=>({ServiceApplyPanel:()=> <p>공급자 사업자 신청·상태</p>}));
import SupplierServiceEntry from '../SupplierServiceEntry';
afterEach(cleanup);
it('keeps anonymous introduction and contact available without a business application',()=>{
 state.user=null;state.isAuthenticated=false;render(<MemoryRouter><SupplierServiceEntry /></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Contact Us'})).toBeTruthy();expect(screen.queryByText('공급자 사업자 신청·상태')).toBeNull();
});
it('offers the service operator management without asking them to join as a supplier business',()=>{
 state.user={id:'operator',roles:['supplier:operator'],memberships:[{serviceKey:'supplier',status:'active'}]};state.isAuthenticated=true;
 render(<MemoryRouter><SupplierServiceEntry /></MemoryRouter>);
 expect(screen.getByRole('link',{name:'공급자 서비스 운영 관리'}).getAttribute('href')).toBe('/operator/suppliers');expect(screen.queryByText('공급자 사업자 신청·상태')).toBeNull();
});
it('preserves the business entry when the account also has its own supplier business role',()=>{
 state.user={id:'dual',roles:['supplier:operator','neture:supplier'],memberships:[{serviceKey:'supplier',status:'active'}]};state.isAuthenticated=true;
 render(<MemoryRouter><SupplierServiceEntry /></MemoryRouter>);expect(screen.getByText('공급자 사업자 신청·상태')).toBeTruthy();
});
