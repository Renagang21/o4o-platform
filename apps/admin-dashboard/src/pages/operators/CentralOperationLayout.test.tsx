import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter,Link} from 'react-router-dom';
import {CENTRAL_OPERATION_MENUS} from '@o4o/types';
import Layout from './CentralOperationLayout';
import {centralGroups,centralMenuHref} from './central-operation-groups';
afterEach(cleanup);
const services=[['neture','약국·공통 운영'],['supplier','공급자']] as const;
const view=(path='/operations',menus=CENTRAL_OPERATION_MENUS)=>render(<MemoryRouter initialEntries={[path]}><Layout services={services.filter(([key])=>menus.some(m=>m.service===key))} menus={menus} header={<p>합성 헤더</p>}><Link to="/operations/neture/candidates">직접 후보 검토로</Link></Layout></MemoryRouter>);
it('assigns every menu once without changing any destinations, including all 32 common-operation tasks',()=>{
 const all=CENTRAL_OPERATION_MENUS.flatMap(menu=>centralGroups([menu]).flatMap(g=>g.menus));
 expect(all.map(m=>m.key).sort()).toEqual(CENTRAL_OPERATION_MENUS.map(m=>m.key).sort());
 const groups=centralGroups(CENTRAL_OPERATION_MENUS.filter(m=>m.service==='neture'));
 expect(groups.map(g=>[g.label,g.menus.length])).toEqual([['회원·자격',6],['문의·알림',2],['상품',7],['매장·거래',3],['콘텐츠·포럼',8],['운영·설정',6]]);
 expect(groups.flatMap(g=>g.menus).map(centralMenuHref)).toContain('/operations/neture/candidates');
});
it('starts collapsed, opens the destination on navigation and keeps manual collapse through equivalent refreshes',()=>{
 const v=view();expect(screen.queryByRole('link',{name:'상품 후보 검토'})).toBeNull();fireEvent.click(screen.getByRole('link',{name:'직접 후보 검토로'}));
 expect(screen.getByRole('link',{name:'상품 후보 검토'}).getAttribute('aria-current')).toBe('page');expect(screen.getByRole('button',{name:'상품'}).getAttribute('aria-expanded')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'상품'}));expect(screen.queryByRole('link',{name:'상품 후보 검토'})).toBeNull();
 // A parent grant refresh must not force a manually collapsed group back open.
 v.rerender(<MemoryRouter><Layout services={services} menus={[...CENTRAL_OPERATION_MENUS]} header={null}>합성</Layout></MemoryRouter>);
 expect(screen.queryByRole('link',{name:'상품 후보 검토'})).toBeNull();
});
it('opens the matching business and group for a direct detail URL',()=>{
 view('/operations/neture/service-members/fixture');expect(screen.getByRole('button',{name:'약국·공통 운영'}).getAttribute('aria-expanded')).toBe('true');
 expect(screen.getByRole('button',{name:'회원·자격'}).getAttribute('aria-expanded')).toBe('true');expect(screen.getByRole('link',{name:'O4O 서비스 회원·이용 상태'}).getAttribute('aria-current')).toBe('page');
});
it('uses the same permitted tree in a mobile dialog and closes on selection with focus returned',()=>{
 view('/operations/neture/candidates');fireEvent.click(screen.getByRole('button',{name:/업무 메뉴/}));const dialog=screen.getByRole('dialog',{name:'통합 운영 메뉴'});
 expect(within(dialog).getByRole('link',{name:'상품 후보 검토'})).toBeTruthy();expect(document.body.style.overflow).toBe('hidden');fireEvent.click(within(dialog).getByRole('link',{name:'상품 후보 검토'}));
 expect(screen.queryByRole('dialog')).toBeNull();expect(document.body.style.overflow).toBe('');
});
it('does not expose ungranted businesses or add a fold for a group with one available task',()=>{
 view('/operations/supplier/inbox',CENTRAL_OPERATION_MENUS.filter(m=>m.key==='supplier.inbox'));
 expect(screen.queryByRole('button',{name:'약국·공통 운영'})).toBeNull();expect(screen.queryByRole('button',{name:'문의·알림'})).toBeNull();expect(screen.getByRole('link',{name:'운영 알림·문의함'})).toBeTruthy();expect(screen.queryByRole('link',{name:'공급자 상태 관리'})).toBeNull();
});
