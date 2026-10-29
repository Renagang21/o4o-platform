import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { DomainIASidebar, DEFAULT_OPERATOR_DOMAIN_IA, type OperatorDomainIAConfig } from '@o4o/operator-ux-core';
import { OperatorCapability } from '@o4o/types';
afterEach(cleanup);
const config: OperatorDomainIAConfig={...DEFAULT_OPERATOR_DOMAIN_IA,labels:{supplier:{label:'공급자',emoji:''},funding:{label:'펀딩',emoji:''}},displayOrder:['supplier','funding'],topPinnedGroups:[],groupOrder:{supplier:['users'],funding:['users']},collapsibleDomains:true};
const menus={users:[{label:'공급 신청',path:'/operations/supplier/review',domain:'supplier'},{label:'펀딩 신청',path:'/operations/funding/review',domain:'funding'}]};
function Nav(){const navigate=useNavigate();return <button onClick={()=>navigate('/operations/supplier/review')}>직접 이동</button>;}
function view(c=config,path='/operations'){return render(<MemoryRouter initialEntries={[path]}><DomainIASidebar menuItems={menus} capabilities={Object.values(OperatorCapability)} domainIAConfig={c}/><Nav/></MemoryRouter>);}
it('collapses services by default and opens the active destination after navigation',()=>{
  view();expect(screen.queryByRole('link',{name:'공급 신청'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'공급자'}));expect(screen.getByRole('link',{name:'공급 신청'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'공급자'}));expect(screen.queryByRole('link',{name:'공급 신청'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'직접 이동'}));expect(screen.getByRole('link',{name:'공급 신청'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'공급자'}).getAttribute('aria-expanded')).toBe('true');
});
it('keeps the current domain manually collapsed across equivalent menu refreshes',()=>{
 const v=view(config,'/operations/supplier/review');fireEvent.click(screen.getByRole('button',{name:'공급자'}));
 v.rerender(<MemoryRouter initialEntries={['/operations/supplier/review']}><DomainIASidebar menuItems={{users:[...menus.users]}} capabilities={Object.values(OperatorCapability)} domainIAConfig={{...config}}/><Nav/></MemoryRouter>);
 expect(screen.queryByRole('link',{name:'공급 신청'})).toBeNull();
});
it('preserves existing service hosts when the option is absent',()=>{
 view({...config,collapsibleDomains:undefined});expect(screen.getByRole('link',{name:'공급 신청'})).toBeTruthy();expect(screen.queryByRole('button',{name:'공급자'})).toBeNull();
});
