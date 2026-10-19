import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BusinessHomeShowcaseManager } from './BusinessHomeShowcaseManager';
import { configurePharmacyManagementClient } from './api';
afterEach(cleanup);
function client(put=vi.fn().mockResolvedValue({data:{}})) {
  const get=vi.fn().mockImplementation(async(path:string)=>({data:{data:path.endsWith('history')?[]:{businessKey:'carepharm',version:2,items:[{id:'product:a',kind:'product',title:'Reviewed product',hidden:false,position:1000}]}}}));
  configurePharmacyManagementClient({get,put,post:vi.fn(),patch:vi.fn(),delete:vi.fn()});return {get,put};
}
it('does not load before the management section is opened',()=>{
  const {get}=client();render(<BusinessHomeShowcaseManager businessKey="carepharm" />);expect(get).not.toHaveBeenCalled();
});
it('preserves edited input and explains a conflicting save without retrying automatically',async()=>{
  const put=vi.fn().mockRejectedValue({response:{data:{error:'목록을 다시 조회해 주세요.'}}});client(put);
  render(<BusinessHomeShowcaseManager businessKey="carepharm" />);fireEvent.click(screen.getByRole('button',{name:'메인 진열 관리 · 처리 이력'}));
  const input=await screen.findByRole('spinbutton');fireEvent.change(input,{target:{value:'5'}});
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Reviewed product 진열 저장'}));
  await screen.findByRole('alert');expect((input as HTMLInputElement).value).toBe('5');expect(put).toHaveBeenCalledExactlyOnceWith('/neture/operator/semi-franchises/carepharm/showcase',{id:'product:a',hidden:true,position:5,version:2});
});
it('prevents double execution and ignores completion after changing business',async()=>{
  let complete: (value: any)=>void=()=>{};const put=vi.fn().mockImplementation(()=>new Promise(r=>{complete=r;}));client(put);
  const ui=render(<BusinessHomeShowcaseManager businessKey="carepharm" />);fireEvent.click(screen.getByRole('button',{name:'메인 진열 관리 · 처리 이력'}));
  const save=await screen.findByRole('button',{name:'Reviewed product 진열 저장'});fireEvent.click(save);fireEvent.click(save);expect(put).toHaveBeenCalledTimes(1);
  ui.rerender(<BusinessHomeShowcaseManager businessKey="other" />);complete({data:{}});
  await waitFor(()=>expect(screen.queryByText('진열 변경을 저장했습니다.')).toBeNull());
});
