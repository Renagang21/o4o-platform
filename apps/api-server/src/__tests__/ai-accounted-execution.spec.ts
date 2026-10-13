const mockExecute = jest.fn();
jest.mock('@o4o/ai-core', () => ({ execute: (...args: unknown[]) => mockExecute(...args) }));
import { AiAccountedExecution } from '../modules/ai-policy/ai-accounted-execution.js';
import { AiPolicyExecutorService } from '../modules/ai-policy/ai-policy-executor.service.js';

const primary = { provider: 'gemini' as const, systemPrompt:'system', userPrompt:'user', config:{apiKey:'synthetic-key',model:'primary',maxTokens:10},retry:{maxAttempts:2,delayMs:0} };
const fallback = { ...primary, provider:'openai' as const,config:{...primary.config,model:'fallback'},retry:{maxAttempts:1,delayMs:0} };
const account = { scope:'CONTENT_TRANSLATION' as const,userId:'verified-actor' };
const response = {content:'answer',provider:'gemini',model:'primary',promptTokens:4,completionTokens:3,durationMs:5,requestId:'00000000-0000-4000-8000-000000000001',attempts:1};
const originalPricing = process.env.AI_PRICING_CATALOG;
afterAll(()=>{if(originalPricing===undefined)delete process.env.AI_PRICING_CATALOG;else process.env.AI_PRICING_CATALOG=originalPricing;});
beforeEach(()=>{jest.clearAllMocks();delete process.env.AI_PRICING_CATALOG;});
function harness() {
  const save=jest.fn(async()=>{}),repo={create:(x:unknown)=>x,save},manager={getRepository:()=>repo};
  const reserve=jest.fn(async()=>({id:'reservation',warnings:[]}));
  const settle=jest.fn(async (_r:unknown,_u:unknown,record:(manager:any)=>Promise<void>)=>record(manager));
  const dataSource={manager,getRepository:()=>({findOne:async()=>({provider:'gemini',model:'primary',isEnabled:true,maxTokens:10,temperature:0.3,retryMax:2,retryDelayMs:0})})};
  const quota={reserve,settle};
  return {service:new AiAccountedExecution(dataSource as any,quota as any),quota,save,dataSource};
}
it('books primary and fallback budget before calling a provider and settles model-priced usage once',async()=>{
  const h=harness();mockExecute.mockResolvedValue(response);
  await expect(h.service.invoke(primary,account,fallback)).resolves.toEqual(response);
  expect(h.quota.reserve.mock.invocationCallOrder[0]).toBeLessThan(mockExecute.mock.invocationCallOrder[0]);
  expect(h.quota.reserve).toHaveBeenCalledWith('CONTENT_TRANSLATION','verified-actor',expect.objectContaining({requests:1,tokens:60}),expect.arrayContaining([expect.objectContaining({version:'legacy-provider-estimate-v1'})]),undefined);
  expect(h.save).toHaveBeenCalledWith(expect.objectContaining({userId:'verified-actor',provider:'gemini',costEstimated:0.0000065}));
});
it.each(['QUOTA_EXCEEDED','AI_QUOTA_UNAVAILABLE'])('never dispatches a paid call after %s',async code=>{
  const h=harness();h.quota.reserve.mockRejectedValueOnce(new Error(code));
  await expect(h.service.invoke(primary,account,fallback)).rejects.toThrow(code);expect(mockExecute).not.toHaveBeenCalled();
});
it('never invokes fallback after primary success when log/settlement fails',async()=>{
  const h=harness();mockExecute.mockResolvedValue(response);h.quota.settle.mockRejectedValueOnce(new Error('receipt unavailable'));
  await expect(h.service.invoke(primary,account,fallback)).resolves.toEqual(response);
  expect(mockExecute).toHaveBeenCalledTimes(1);
});
it('records actual fallback provider and holds unknown primary cost for reconciliation',async()=>{
  const h=harness();mockExecute.mockRejectedValueOnce(new Error('provider timeout')).mockResolvedValueOnce({...response,model:'fallback',provider:'openai'});
  await h.service.invoke(primary,account,fallback);
  expect(h.save).toHaveBeenCalledWith(expect.objectContaining({provider:'openai',model:'fallback',costEstimated:0.0003}));
  expect(h.quota.settle).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({requests:1,tokens:7}),expect.any(Function),expect.objectContaining({uncertain:expect.objectContaining({requests:0,tokens:40})}));
});
it('holds failed retry estimates without calling the provider again during persistence',async()=>{
  const h=harness();mockExecute.mockResolvedValue({...response,attempts:2});await h.service.invoke(primary,account);
  expect(h.quota.settle).toHaveBeenCalledWith(expect.anything(),expect.anything(),expect.any(Function),expect.objectContaining({uncertain:expect.objectContaining({tokens:20})}));
  expect(mockExecute).toHaveBeenCalledTimes(1);
});
it('keeps failed-call reservation and records only a sanitized error without provider response text',async()=>{
  const h=harness();mockExecute.mockRejectedValue(new Error('sensitive request/provider error'));
  await expect(h.service.invoke(primary,account)).rejects.toThrow('sensitive request/provider error');
  expect(h.save).toHaveBeenCalledWith(expect.objectContaining({errorMessage:'PROVIDER_FAILED_USAGE_UNKNOWN',errorType:'PROVIDER_FAILED'}));
  expect(h.quota.settle).not.toHaveBeenCalled();
});
it('rejects malformed pricing and missing keys before admission or dispatch',async()=>{
  const h=harness();process.env.AI_PRICING_CATALOG='malformed';
  await expect(h.service.invoke(primary,account)).rejects.toThrow('AI_PRICING_INVALID');
  await expect(h.service.invoke({...primary,config:{...primary.config,apiKey:''}},account)).rejects.toThrow('AI_NOT_CONFIGURED');
  expect(h.quota.reserve).not.toHaveBeenCalled();expect(mockExecute).not.toHaveBeenCalled();
});
it('fails closed on a policy DB outage instead of silently using the canonical policy',async()=>{
  const h=harness();h.dataSource.getRepository=()=>({findOne:async()=>{throw new Error('connection unavailable');}} as any);
  const service=new AiPolicyExecutorService(h.dataSource as any,h.quota as any);
  await expect(service.execute('CONTENT_TRANSLATION','system','user')).rejects.toThrow('AI_POLICY_UNAVAILABLE');
  expect(mockExecute).not.toHaveBeenCalled();
});

it('keeps capacity held when a nonempty response omits usage instead of pricing it as free',async()=>{
  const h=harness();mockExecute.mockResolvedValue({...response,promptTokens:0,completionTokens:0});
  await expect(h.service.invoke(primary,account)).resolves.toMatchObject({content:'answer'});
  expect(h.quota.settle).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({requests:1,cost:0}),expect.any(Function),expect.objectContaining({uncertain:expect.objectContaining({tokens:40}),detail:expect.objectContaining({provider:'gemini',model:'primary'})}));
});
it('uses the admission price version even if configured prices change during a provider call',async()=>{
  const h=harness();
  mockExecute.mockImplementationOnce(async()=>{
    process.env.AI_PRICING_CATALOG=JSON.stringify({version:'changed-v2',rates:[{provider:'gemini',model:'primary',currency:'USD',inputPerMillion:100,outputPerMillion:100}]});
    return response;
  });
  await h.service.invoke(primary,account);
  expect(h.save).toHaveBeenCalledWith(expect.objectContaining({costEstimated:0.0000065}));
  expect(h.quota.settle).toHaveBeenCalledWith(expect.anything(),expect.anything(),expect.any(Function),expect.objectContaining({detail:expect.objectContaining({price:expect.objectContaining({version:'legacy-provider-estimate-v1'})})}));
});
