import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:vi.fn().mockResolvedValue({data:{data:[{id:'synthetic-project',title:'합성 펀딩',status:'draft',reviewStatus:'pending'}]}})}}}));
vi.mock('@o4o/operator-ux-core',()=>({DataTable:({data,columns}:any)=><>{data.map((r:any)=><div key={r.id}>{columns.map((c:any)=><span key={c.key}>{c.render?.(null,r)}</span>)}</div>)}</>}));
import CentralFundingReview from './CentralFundingReview';
afterEach(cleanup);
it('preserves the existing product, reward and recruitment application review before approval',async()=>{
 render(<CentralFundingReview/>);
 expect(await screen.findByRole('link',{name:'합성 펀딩 · 신청 상세 검토'})).toHaveAttribute('href','https://funding.neture.co.kr/operator/market-trial/synthetic-project');
});
