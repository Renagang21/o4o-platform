import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
vi.mock('@o4o/auth-context',()=>({useAuth:()=>({user:{id:'fixture',roles:['platform:super_admin']}})}));
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:vi.fn(async()=>({data:{success:true,data:[],sections:{}}}))}}}));
vi.mock('../o4o-product-db/CandidateConflictDrawer',()=>({default:()=>null}));
import Page from './CentralNetureProductOperations';
afterEach(cleanup);
it.each([false,true])('uses live cleanup menu permission rather than a platform role shortcut: %s',async allowed=>{
 render(<Page area="product-approvals" menuKeys={allowed?['neture.product-approvals','neture.cleanup']:['neture.product-approvals']}/>);
 await screen.findByText('등록된 상품이 없습니다');
 expect(Boolean(screen.queryByRole('button',{name:'휴지통 열기'}))).toBe(allowed);
});
