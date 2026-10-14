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
