import 'reflect-metadata';
jest.mock('@o4o/forum-core',()=>({blocksToText:jest.requireActual('../../../../../packages/forum-core/src/backend/types/index.ts').blocksToText}));
import { runServerContentWork, isServerContentRequest } from './server-work.js';
const authorize=jest.fn(),materials=jest.fn(),material=jest.fn(),save=jest.fn();
jest.mock('../../modules/external-ai/adapters/adapter.js',()=>({assertAccount:jest.fn(async()=>{})}));
jest.mock('../../modules/external-ai/adapters/registry.js',()=>({AdapterRegistry:class{
 workspaces=async()=>[{id:'store:fixture',name:'합성 매장',kind:'store',writable:true,destinations:['store_document']}];
 resolve=()=>({kind:'store',id:'fixture',adapter:{authorize,materials,material,save}});
}}));
jest.mock('../assistant/task-ownership.js',()=>({resolveTaskOwnership:async()=>({scope:'USER',organizationId:null,serviceKey:'neture'})}));
jest.mock('../assistant/assistant-task-store.js',()=>({createAssistantTask:async()=>({taskId:'fixture-task'}),updateAssistantTask:jest.fn(async()=>({}))}));
const manager={},db={transaction:async fn=>fn(manager)} as any;
beforeEach(()=>{jest.clearAllMocks();authorize.mockResolvedValue({});materials.mockResolvedValue({items:[{id:'fixture',title:'합성 자료'}]});save.mockResolvedValue({id:'draft-fixture'});});
it('recognizes internal work without claiming a PC is required',()=>{
 expect(isServerContentRequest('내 매장 자료함 문서를 찾아줘')).toBe(true);
 expect(isServerContentRequest('약학정보원에서 약을 검색해줘')).toBe(false);
 expect(isServerContentRequest('내 매장 자료를 메모장에 작성해줘')).toBe(false);
});
it('executes authorized server reads through the existing domain adapter',async()=>{
 const result=await runServerContentWork(db,'user-fixture','내 매장 문서를 찾아줘',{},async()=>JSON.stringify({action:'materials',workspace:'store:fixture',query:'자료'}));
 expect(authorize).toHaveBeenCalledWith('user-fixture','fixture',false,db);
 expect(materials).toHaveBeenCalledWith(db,'fixture','자료',1,20,'user-fixture');
 expect(result.message).toContain('합성 자료');expect(save).not.toHaveBeenCalled();
});
it('rejects invented workspaces and unrequested writes before domain mutations',async()=>{
 await runServerContentWork(db,'user-fixture','내 매장 자료 보여줘',{},async()=>JSON.stringify({action:'materials',workspace:'store:other',query:''}));
 expect(authorize).not.toHaveBeenCalled();
 await runServerContentWork(db,'user-fixture','내 매장 자료 보여줘',{},async()=>JSON.stringify({action:'draft',workspace:'store:fixture',destination:'store_document',title:'초안',content:'내용'}));
 expect(save).not.toHaveBeenCalled();
});
it('rechecks write authorization in the saving transaction and creates only a draft',async()=>{
 const result=await runServerContentWork(db,'user-fixture','내 매장 문서 초안을 작성해줘',{},async()=>JSON.stringify({action:'draft',workspace:'store:fixture',destination:'store_document',title:'초안',content:'내용'}));
 expect(authorize).toHaveBeenLastCalledWith('user-fixture','fixture',true,manager);
 expect(save).toHaveBeenCalledWith(manager,'user-fixture','fixture',{destination:'store_document',title:'초안',content:'내용',language:'ko'});
 expect(result.message).toContain('공개·게시는 진행하지');
});
it('propagates existing authorization failure without saving',async()=>{
 authorize.mockRejectedValue(Error('FORBIDDEN'));
 await expect(runServerContentWork(db,'user-fixture','내 매장 문서 초안을 작성해줘',{},async()=>JSON.stringify({action:'draft',workspace:'store:fixture',destination:'store_document',title:'초안',content:'내용'}))).rejects.toThrow('FORBIDDEN');
 expect(save).not.toHaveBeenCalled();
});

it('includes real block-to-text conversion for stored community-style material bodies',async()=>{
 material.mockResolvedValue({title:'합성 게시글',content:[{id:'b1',type:'paragraph',content:'<p>첫 번째 본문</p>'},{id:'b2',type:'paragraph',content:{text:'두 번째 본문'}}]});
 const result=await runServerContentWork(db,'user-fixture','내 매장 문서를 읽어줘',{},async()=>JSON.stringify({action:'material',workspace:'store:fixture',id:'11111111-1111-4111-8111-111111111111'}));
 expect(result.message).toContain('첫 번째 본문');expect(result.message).toContain('두 번째 본문');expect(result.message).not.toContain('<p>');
});

it('reads the real search result without requiring the user to know its UUID',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 materials.mockResolvedValue({items:[{id,title:'찾은 문서'}]});material.mockResolvedValue({title:'찾은 문서',content:'본문 전체'});
 const generate=jest.fn(async()=>JSON.stringify({action:'materials',workspace:'store:fixture',query:'찾은 문서'}));
 const result=await runServerContentWork(db,'user-fixture','내 매장 자료함에서 찾은 문서를 읽어줘',{},generate);
 expect(material).toHaveBeenCalledWith(db,'fixture',id,'user-fixture');expect(result.message).toContain('본문 전체');expect(generate).toHaveBeenCalledTimes(1);
});
it('asks for a title when search is ambiguous and resolves an explicit title on the next request',async()=>{
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 materials.mockResolvedValue({items:[{id:a,title:'운영 안내'},{id:b,title:'주문 안내'}]});
 const generate=async()=>JSON.stringify({action:'materials',workspace:'store:fixture',query:'안내'});
 const ambiguous=await runServerContentWork(db,'user-fixture','내 매장 자료함 안내 내용을 읽어줘',{},generate);
 expect(material).not.toHaveBeenCalled();expect(ambiguous.message).toContain('[제목] 읽어줘');
 material.mockResolvedValue({title:'주문 안내',content:'선택한 본문'});
 const selected=await runServerContentWork(db,'user-fixture','O4O 합성 매장 자료함에서 주문 안내 읽어줘',{},generate);
 expect(isServerContentRequest('O4O 합성 매장 자료함에서 주문 안내 읽어줘')).toBe(true);
 expect(material).toHaveBeenCalledWith(db,'fixture',b,'user-fixture');expect(selected.message).toContain('선택한 본문');
});
