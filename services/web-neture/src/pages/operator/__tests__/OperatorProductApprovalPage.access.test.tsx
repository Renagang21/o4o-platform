import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Page from '../OperatorProductApprovalPage';
const api=vi.hoisted(()=>({getProducts:vi.fn(),getRecycleBin:vi.fn()}));
const user=vi.hoisted(()=>({id:'first',roles:['neture:operator']}));
vi.mock('../../../contexts/AuthContext',()=>({getAccessToken:()=>null,useAuth:()=>({user})}));
vi.mock('../../../lib/api/operatorProductApi',()=>({operatorProductApi:{getProducts:api.getProducts}}));
vi.mock('../../../lib/api/operatorProductCleanup',()=>({productCleanupApi:{getRecycleBin:api.getRecycleBin}}));
vi.mock('../../../lib/apiClient',()=>({api:{get:vi.fn(async()=>({data:{data:{sections:{}}}}))}}));
beforeEach(()=>{vi.resetAllMocks();user.id='first';api.getProducts.mockResolvedValue([]);});
afterEach(cleanup);
it.each([false,true])('uses real native-host access rather than the same operator role: %s',async allowed=>{
 if(allowed)api.getRecycleBin.mockResolvedValue({success:true,data:[],pagination:{total:0,totalPages:0}});else api.getRecycleBin.mockRejectedValue({response:{status:403}});
 render(<MemoryRouter><Page/></MemoryRouter>);await screen.findByText('등록된 상품이 없습니다');
 await waitFor(()=>expect(Boolean(screen.queryByRole('button',{name:'휴지통 열기'}))).toBe(allowed));
 expect(api.getRecycleBin).toHaveBeenCalledWith(1,1);
});
it('ignores a late allowed response after switching to a restricted identity',async()=>{
 let finish!:(value:unknown)=>void;api.getRecycleBin.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockRejectedValueOnce({response:{status:403}});
 const v=render(<MemoryRouter><Page/></MemoryRouter>);await screen.findByText('등록된 상품이 없습니다');user.id='second';v.rerender(<MemoryRouter><Page/></MemoryRouter>);
 await waitFor(()=>expect(api.getRecycleBin).toHaveBeenCalledTimes(2));finish({success:true,data:[]});
 await new Promise(resolve=>setTimeout(resolve,0));expect(screen.queryByRole('button',{name:'휴지통 열기'})).toBeNull();
});
