import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const auth = vi.hoisted(() => ({ user: null as null | { roles: string[]; memberships: {serviceKey:string;status:string}[] }, isAuthenticated: false, isLoading: false, logout: vi.fn() }));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('@o4o/auth-react',()=>({MyHomeButton:({isAuthenticated}:{isAuthenticated:boolean})=>isAuthenticated ? <button>My Home</button> : null,O4OHomeButton:()=> <a href="https://neture.co.kr/">O4O 메인으로</a>,O4O_LOGOUT_LABEL:'로그아웃'}));
vi.mock('@o4o/shared-space-ui',()=>({PublicLegalFooterInfo:()=>null}));
vi.mock('../lib/apiClient',()=>({authClient:{api:{}}}));
vi.mock('../lib/footerLegal',()=>({loadFooterLegal:vi.fn()}));
import SiteShell from './SiteShell';
afterEach(()=>{cleanup();auth.user=null;auth.isAuthenticated=false;});
it('일반 공개 진입에는 강의·문의·메인 복귀를 제공하며 업무 메뉴를 숨긴다',()=>{
 render(<MemoryRouter><SiteShell /></MemoryRouter>);
 expect(screen.getByRole('link',{name:'강의'})).toBeTruthy();
 expect(screen.getByRole('link',{name:'이용 · 개설 문의'})).toBeTruthy();
 expect(screen.queryByText('업무 메뉴')).toBeNull();
});
it('자격을 갖춘 강사·운영자 링크만 별도 업무 메뉴에 묶는다',()=>{
 auth.isAuthenticated=true;auth.user={roles:['lecture:instructor','lecture:operator'],memberships:[{serviceKey:'lecture',status:'active'}]};
 render(<MemoryRouter><SiteShell /></MemoryRouter>);
 const tasks=screen.getByRole('navigation',{name:'강의 업무 메뉴',hidden:true});
 expect(within(tasks).getAllByRole('link',{hidden:true}).map(a=>a.getAttribute('href'))).toEqual(['/instructor','/operator','/operator/contact','/operator/members']);
});
