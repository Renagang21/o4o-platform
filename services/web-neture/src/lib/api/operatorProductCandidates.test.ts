import {afterEach,expect,it,vi} from 'vitest';
const http=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../apiClient',()=>({api:http}));
import {operatorProductCandidateApi as candidates} from './operatorProductCandidates';
afterEach(()=>{vi.resetAllMocks();});
it('keeps list, summary and whole-query writes in the same Neture/common scope',async()=>{
 http.get.mockResolvedValueOnce({data:{success:true,data:{items:[],total:0}}}).mockResolvedValueOnce({data:{success:true,data:{total:0,review:0,intake:0,sources:[],reasons:[]}}});
 await candidates.list({serviceKey:'other',includeShared:false});await candidates.workflowSummary({serviceKey:'other'});
 expect(http.get.mock.calls[0][1].params).toMatchObject({serviceKey:'neture',includeShared:'true'});
 expect(http.get.mock.calls[1][1].params).toMatchObject({serviceKey:'neture',includeShared:true});
 const fingerprint='a'.repeat(64),cutoff='2026-10-30T00:00:00Z';
 http.post.mockResolvedValueOnce({data:{success:true,data:{count:12000,cutoff,fingerprint,action:'archive'}}}).mockResolvedValueOnce({data:{success:true,data:{updated:12000,status:'archived'}}});
 const selection={filter:{serviceKey:'other',queue:'intake' as const},action:'archive' as const};
 await candidates.workflowPreview(selection);await candidates.workflowExecute({...selection,cutoff,fingerprint,expectedCount:12000});
 for(const [,payload] of http.post.mock.calls)expect(payload.filter).toMatchObject({serviceKey:'neture',includeShared:true,queue:'intake'});
 expect(http.post.mock.calls[1][1].ids).toBeUndefined();
});
it('rejects malformed preview and summary responses instead of inventing an empty success',async()=>{
 http.post.mockResolvedValue({data:{success:true,data:{count:12000}}});await expect(candidates.workflowPreview({filter:{},action:'review'})).rejects.toThrow('INVALID_WORKFLOW_PREVIEW');
 http.get.mockResolvedValue({data:{success:true,data:{total:0}}});await expect(candidates.workflowSummary({})).rejects.toThrow('INVALID_WORKFLOW_SUMMARY');
});
