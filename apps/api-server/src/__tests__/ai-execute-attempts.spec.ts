import { execute } from '@o4o/ai-core';
it('reports provider attempts for conservative cost reconciliation without changing retry behavior',async()=>{
  const savedFetch=global.fetch;
  const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
  const fetch=jest.fn().mockResolvedValueOnce({ok:false,status:503,text:async()=> 'fixture retry'})
    .mockResolvedValueOnce({ok:true,json:async()=>({model:'gpt-4o',choices:[{message:{content:'answer'}}],usage:{prompt_tokens:2,completion_tokens:3}})});
  global.fetch=fetch;
  try {
    const result=await execute({systemPrompt:'system',userPrompt:'user',provider:'openai',responseMode:'text',config:{apiKey:'synthetic-key',model:'gpt-4o',maxTokens:10},retry:{maxAttempts:2,delayMs:0}});
    expect(result).toMatchObject({attempts:2,content:'answer',promptTokens:2,completionTokens:3});
    expect(fetch).toHaveBeenCalledTimes(2);
  } finally {global.fetch=savedFetch;warn.mockRestore();}
});


it('Core execute owns Gemini JSON retries, so maxAttempts also bounds real paid calls', async () => {
  const { execute } = await import('@o4o/ai-core');
  const original = global.fetch;
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'invalid JSON' }] } }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }], usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 3 } }) });
  global.fetch = fetchMock;
  try {
    const result = await execute({ systemPrompt: 'system', userPrompt: 'user', provider: 'gemini', config: { apiKey: 'synthetic-key', model: 'normal' }, retry: { maxAttempts: 2, delayMs: 0 } });
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally { global.fetch = original; }
});
