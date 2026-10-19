import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BusinessHomeShowcase } from './BusinessHomeShowcase';
afterEach(cleanup);
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
