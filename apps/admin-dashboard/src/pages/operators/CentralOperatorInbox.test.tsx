import { MemoryRouter } from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {useEffect,useState} from 'react';
const mock=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:mock.get}}}));
vi.mock('@o4o/operator-core-ui',()=>({OperatorInbox:({client,endpoint}:any)=>{
 const [tasks,setTasks]=useState<any[]>([]);
 useEffect(()=>{void client.get(`${endpoint}/manage`).then((r:any)=>setTasks(r.data.data.tasks));},[client,endpoint]);
 return <>{tasks.map(t=><a key={t.key} href={t.href}>{t.label}</a>)}</>;
}}));
vi.mock('./CentralSharedWork',()=>({CentralServiceContactInquiry:({serviceKey}:any)=><p>문의 범위: {serviceKey}</p>}));
import CentralOperatorInbox from './CentralOperatorInbox';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it.each([
 ['supplier','/operator/suppliers','/operations/supplier/suppliers'],
 ['funding','/operator/market-trial?tab=exceptions&type=payment_unconfirmed','/operations/funding/funding?tab=exceptions&type=payment_unconfirmed'],
])('maps actual manage response tasks for %s',(async(service,path,target)=>{
 mock.get.mockResolvedValueOnce({data:{data:{tasks:[{key:'task',href:path,label:'미처리 업무'}]}}});
 render(<MemoryRouter><CentralOperatorInbox serviceKey={service}/></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'미처리 업무'})).toHaveAttribute('href',target);
 expect(mock.get).toHaveBeenCalledWith(`/operator-inbox/service/${service}/manage`);
}));

it('opens the selected general-service contact tab and switches without exposing independent scopes',async()=>{
 render(<MemoryRouter initialEntries={['/operations/neture/inbox?contactService=hospital']}><CentralOperatorInbox serviceKey="neture"/></MemoryRouter>);
 expect(screen.getByText('문의 범위: hospital')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'분회 서비스 안내 문의'}));
 expect(screen.getByText('문의 범위: kpa-branch')).toBeInTheDocument();
 expect(screen.queryByText('문의 범위: hospital')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Drugstore|CarePharm|개별 조합/})).not.toBeInTheDocument();
});
