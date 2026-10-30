import {it,expect,vi,afterEach} from 'vitest';
const {post}=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('../../lib/apiClient',()=>({api:{post},API_BASE_URL:'https://api.neture.co.kr'}));
import {connectThisPc} from '../localAgent';
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it('account/context cancellation prevents a late grant from being forwarded to the PC',async()=>{
 let resolve!:(value:unknown)=>void;
 post.mockImplementation(()=>new Promise(done=>{resolve=done}));
 const localFetch=vi.fn();vi.stubGlobal('fetch',localFetch);
 const controller=new AbortController();
 const pending=connectThisPc({agentVersion:'0.4.0',connected:false,nonce:'synthetic'},controller.signal);
 controller.abort();resolve({data:{data:{grant:'synthetic'}}});
 expect(await pending).toEqual({ok:false,code:'CONNECTION_CANCELLED'});
 expect(localFetch).not.toHaveBeenCalled();
 expect(post.mock.calls[0][2].signal.aborted).toBe(true);
});
it('an already-cancelled connection never requests a grant',async()=>{
 const controller=new AbortController();controller.abort();
 await connectThisPc({agentVersion:'0.4.0',connected:false,nonce:'synthetic'},controller.signal);
 expect(post).not.toHaveBeenCalled();
});
