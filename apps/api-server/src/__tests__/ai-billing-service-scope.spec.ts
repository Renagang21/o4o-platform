import { AiBillingService } from '../modules/ai-policy/ai-billing.service.js';
it('keeps other services out of a service billing breakdown and groups shared features from bound receipts',async()=>{
  const query=jest.fn(async(sql:string)=>{
    if(sql.includes('ai_billing_summary'))return [{id:1,period:'2026-10',serviceKey:'store',totalRequests:2,totalTokens:10,totalCost:0.1,adjustmentAmount:0,finalCost:0.1,status:'draft'}];
    if(sql.includes('ai_usage_aggregate'))return [
      {scope:'CONTENT_TRANSLATION',limitType:'requests',currentValue:2},
      {scope:'CARE_CHAT',limitType:'cost',currentValue:999},
      {scope:'SERVICE_QUERY',limitType:'cost',currentValue:999},
    ];
    if(sql.includes('ai_usage_reservations'))return [{scope:'SERVICE_QUERY',requests:1,tokens:5,cost:0.05}];
    throw new Error('unexpected query');
  });
  const result=await new AiBillingService({query} as any).getDetail(1);
  expect(result.scopeBreakdown).toEqual([
    {scope:'CONTENT_TRANSLATION',requests:2,tokens:0,cost:0},
    {scope:'SERVICE_QUERY',requests:1,tokens:5,cost:0.05},
  ]);
  expect(query).toHaveBeenCalledWith(expect.stringContaining("status IN ('settled','pending')"),['store','2026-10',expect.any(Array)]);
});
it('surfaces a breakdown DB failure instead of returning a misleading empty success',async()=>{
  const query=jest.fn().mockResolvedValueOnce([{id:1,period:'2026-10',serviceKey:'neture',status:'draft'}]).mockRejectedValueOnce(new Error('db unavailable'));
  await expect(new AiBillingService({query} as any).getDetail(1)).rejects.toThrow('AI_BILLING_BREAKDOWN_UNAVAILABLE');
});
