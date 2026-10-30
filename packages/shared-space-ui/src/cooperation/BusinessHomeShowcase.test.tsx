import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BusinessHomeShowcase } from './BusinessHomeShowcase';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (key: string, title: string) => ({ data: { data: { businessKey: key, items: [{id:'content:a',kind:'content',title,summary:'Approved',body:'<p>Member body</p>'}] } } });
it('does not read protected data before login',()=>{
  const get=vi.fn();render(<BusinessHomeShowcase client={{get}} businessKey="carepharm" />);
  expect(get).not.toHaveBeenCalled();expect(screen.getByText(/로그인과/)).toBeTruthy();
});
it('requires a selected pharmacy and sends its organization, without guessing the first of several stores',async()=>{
  const get=vi.fn().mockImplementation(async(path:string)=>path.includes('accessible-stores')?{data:{data:{stores:[{organizationId:'a',organizationName:'A'},{organizationId:'b',organizationName:'B'}]}}}:response('carepharm','Reviewed'));
  render(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="carepharm" />);
  await screen.findByRole('option',{name:'B'});expect(get).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'b'}});
  await screen.findByText('Reviewed');expect(get).toHaveBeenLastCalledWith('/neture/pharmacy/businesses/carepharm/showcase',{headers:{'X-Store-Organization-Id':'b'}});
});
it('discards old account and business responses',async()=>{
  let finish: (value: unknown)=>void=()=>{};
  const get=vi.fn().mockImplementation((path:string)=>path.includes('/carepharm/')?new Promise(r=>{finish=r;}):Promise.resolve(response('other','New account')));
  const ui=render(<BusinessHomeShowcase client={{get}} accountId="old" businessKey="carepharm" cooperative />);
  ui.rerender(<BusinessHomeShowcase client={{get}} accountId="new" businessKey="other" cooperative />);
  await screen.findByText('New account');finish(response('carepharm','Old account'));
  await waitFor(()=>expect(screen.queryByText('Old account')).toBeNull());
});
it('keeps errors distinct from an empty showcase and retries safely',async()=>{
  const get=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response('coop','Recovered'));
  render(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="coop" cooperative />);
  await screen.findByRole('alert');expect(screen.queryByText('현재 진열된 제품·콘텐츠가 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'진열 다시 조회'}));await screen.findByText('Recovered');
});
it('uses the assigned-operator endpoint for preview and never shows hidden rows',async()=>{
  const get=vi.fn().mockResolvedValue({data:{data:{businessKey:'coop',items:[{id:'product:a',kind:'product',title:'Hidden',hidden:true}]}}});
  render(<BusinessHomeShowcase client={{get}} accountId="operator" businessKey="coop" cooperative operator />);
  await screen.findByText('현재 진열된 제품·콘텐츠가 없습니다.');expect(get).toHaveBeenCalledWith('/neture/operator/semi-franchises/coop/showcase',undefined);
});

it('uses the host pharmacy selection without mounting a second picker or guessing a store',async()=>{
  const get=vi.fn().mockResolvedValue(response('pharmacy','Selected pharmacy'));
  const ui=render(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="pharmacy" externalSelection />);
  expect(get).not.toHaveBeenCalled();expect(screen.queryByRole('combobox')).toBeNull();
  ui.rerender(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="pharmacy" organizationId="explicit" externalSelection />);
  await screen.findByText('Selected pharmacy');expect(get).toHaveBeenCalledExactlyOnceWith('/neture/pharmacy/businesses/pharmacy/showcase',{headers:{'X-Store-Organization-Id':'explicit'}});
});

it('connects the exact approved item through the chosen pharmacy and preserves failed navigation for retry',async()=>{
 const id='11111111-1111-4111-8111-111111111111';const get=vi.fn().mockResolvedValue({data:{data:{businessKey:'carepharm',items:[{id:`product:${id}`,kind:'product',title:'제품',summary:null,body:null}]}}});
 const enter=vi.fn().mockRejectedValueOnce(new Error('handoff')).mockResolvedValue('https://store.neture.co.kr/handoff?code=fixture');
 vi.stubGlobal('window',Object.create(window,{location:{value:{assign:vi.fn()}}}));
 render(<BusinessHomeShowcase client={{get}} accountId="owner" businessKey="carepharm" organizationId="store-a" onEnterStore={enter}/>);
 fireEvent.click(await screen.findByRole('button',{name:'내 약국에서 이 제안 확인'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'내 약국에서 이 제안 확인'}));
 await waitFor(()=>expect(enter).toHaveBeenCalledTimes(2));const destination=new URL(enter.mock.calls[0][0],'https://store.test');expect(destination.searchParams.get('store')).toBe('store-a');expect(destination.searchParams.get('returnTo')).toContain(`proposal=${id}`);
});
it.each([{cooperative:true},{operator:true}])('never converts personal membership or operator preview to purchasing (%j)',async flags=>{
 const get=vi.fn().mockResolvedValue(response('coop','표시 자료'));const enter=vi.fn();render(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="coop" {...flags} onEnterStore={enter}/>);await screen.findByText('표시 자료');expect(screen.queryByRole('button',{name:/내 약국에서/})).toBeNull();expect(enter).not.toHaveBeenCalled();
});

it('discards a handoff completed after the selected pharmacy changes',async()=>{
 const assign=vi.fn();vi.stubGlobal('window',Object.create(window,{location:{value:{assign}}}));
 let release!:(value:string)=>void;const enter=vi.fn(()=>new Promise<string>(r=>{release=r}));
 const get=vi.fn().mockResolvedValue({data:{data:{businessKey:'carepharm',items:[{id:'product:11111111-1111-4111-8111-111111111111',kind:'product',title:'제품',summary:null,body:null}]}}});
 const ui=render(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="carepharm" organizationId="store-a" onEnterStore={enter}/>);
 fireEvent.click(await screen.findByRole('button',{name:'내 약국에서 이 제안 확인'}));
 ui.rerender(<BusinessHomeShowcase client={{get}} accountId="member" businessKey="carepharm" organizationId="store-b" onEnterStore={enter}/>);await screen.findByText('제품');
 await act(async()=>release('https://store.neture.co.kr/handoff?code=fixture'));expect(assign).not.toHaveBeenCalled();
});
