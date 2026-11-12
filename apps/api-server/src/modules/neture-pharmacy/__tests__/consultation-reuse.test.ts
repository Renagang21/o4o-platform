import { ConsultationReuse, consultationReuseKey } from '../services/consultation-reuse.js';
const session = '00000000-0000-4000-8000-000000000001';
const allowed = async () => true;
it('requires an explicit session and separates actor, store, mode, epoch, source and configuration', () => {
  const key = (input = {},actor='a',org='o',data: unknown = {version:1}) => consultationReuseKey({reuseSession:session,mode:'pharmacist',...input},actor,org,data);
  expect(consultationReuseKey({},'a','o',{})).toBeUndefined();
  for(const different of [key({},'other'),key({},'a','other'),key({mode:'staff'}),key({epoch:'new'}),key({reuseSession:'00000000-0000-4000-8000-000000000002'}),key({},'a','o',{version:2})]) expect(different).not.toBe(key());
  expect(key({},'a','o',{question:'PRIVATE'})).not.toContain('PRIVATE');
  expect(()=>key({reuseSession:'forged'})).toThrow();
});
it('reuses completed output and coalesces concurrent work without returning mutable cache references', async () => {
  const cache = new ConsultationReuse<{text:string}>();
  let finish!: (value:{text:string})=>void;
  const produce = jest.fn(()=>new Promise<{text:string}>(resolve=>{finish=resolve;}));
  const first=cache.execute('same',produce,allowed),second=cache.execute('same',produce,allowed);
  await Promise.resolve(); await Promise.resolve(); finish({text:'original'});
  const [a,b]=await Promise.all([first,second]); a.text='changed'; expect(b.text).toBe('original');
  expect((await cache.execute('same',produce,allowed)).text).toBe('original');expect(produce).toHaveBeenCalledTimes(1);
});
it('expires by time and evicts at capacity and byte limits', async () => {
  let now=0;const produce=jest.fn(async()=>({text:'small'}));
  const cache=new ConsultationReuse(()=>now,10,1,100);
  await cache.execute('a',produce,allowed);now=11;await cache.execute('a',produce,allowed);
  await cache.execute('b',produce,allowed);await cache.execute('a',produce,allowed);expect(produce).toHaveBeenCalledTimes(4);
  const bounded=new ConsultationReuse(Date.now,60_000,64,2);
  await bounded.execute('a',produce,allowed);await bounded.execute('a',produce,allowed);expect(produce).toHaveBeenCalledTimes(6);
});
it('never retains a failure or returns a hit after permission/source revocation', async () => {
  const cache=new ConsultationReuse<string>(),produce=jest.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue('ready');
  await expect(cache.execute('a',produce,allowed)).rejects.toThrow('failed');
  expect(await cache.execute('a',produce,allowed)).toBe('ready');
  await expect(cache.execute('a',produce,async()=>false)).rejects.toMatchObject({httpStatus:403});
  expect(produce).toHaveBeenCalledTimes(2);
});
it('rechecks authorization for each joined request', async () => {
  const cache=new ConsultationReuse<string>();let finish!:(v:string)=>void;
  const produce=()=>new Promise<string>(resolve=>{finish=resolve;});
  const authorize=jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const first=cache.execute('a',produce,allowed),second=cache.execute('a',produce,authorize);
  await Promise.resolve();await Promise.resolve();finish('result');
  expect(await first).toBe('result');await expect(second).rejects.toMatchObject({httpStatus:403});
});
