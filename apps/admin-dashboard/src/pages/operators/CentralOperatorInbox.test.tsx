import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {useEffect,useState} from 'react';
const mock=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@o4o/auth-client',()=>({authClient:{api:{get:mock.get}}}));
vi.mock('@o4o/operator-core-ui',()=>({OperatorInbox:({client,endpoint}:any)=>{
 const [tasks,setTasks]=useState<any[]>([]);
 useEffect(()=>{void client.get(`${endpoint}/manage`).then((r:any)=>setTasks(r.data.data.tasks));},[client,endpoint]);
 return <>{tasks.map(t=><a key={t.key} href={t.href}>{t.label}</a>)}</>;
}}));
import CentralOperatorInbox from './CentralOperatorInbox';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it.each([
 ['supplier','/operator/suppliers','/operations/supplier/suppliers'],
 ['funding','/operator/market-trial?tab=exceptions&type=payment_unconfirmed','/operations/funding/funding?tab=exceptions&type=payment_unconfirmed'],
])('maps actual manage response tasks for %s',(async(service,path,target)=>{
 mock.get.mockResolvedValueOnce({data:{data:{tasks:[{key:'task',href:path,label:'미처리 업무'}]}}});
 render(<CentralOperatorInbox serviceKey={service}/>);
 expect(await screen.findByRole('link',{name:'미처리 업무'})).toHaveAttribute('href',target);
 expect(mock.get).toHaveBeenCalledWith(`/operator-inbox/service/${service}/manage`);
}));
