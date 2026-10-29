import { expect, it, vi } from 'vitest';
import { createNetureServiceApi } from './api';
it('confirms exactly the selected inquiry and preserves its notes and list version',async()=>{
  const get=vi.fn(async()=>({data:{success:true,data:{id:'selected',status:'new',adminNotes:'existing memo',updatedAt:'version'}}}));
  const patch=vi.fn(async()=>({data:{success:true}}));
  const api=createNetureServiceApi({get,patch} as any).operatorContactApi;
  await expect(api.markRead({id:'selected',updatedAt:'version'})).resolves.toEqual({skipped:false});
  expect(get).toHaveBeenCalledWith('/neture/operator/contact-messages/selected');
  expect(patch).toHaveBeenCalledWith('/neture/operator/contact-messages/selected',{status:'in_progress',adminNotes:'existing memo',expectedUpdatedAt:'version'});
});
it('never overwrites concurrent changes or reopens a completed inquiry',async()=>{
  const patch=vi.fn();const get=vi.fn();const api=createNetureServiceApi({get,patch} as any).operatorContactApi;
  get.mockResolvedValueOnce({data:{success:true,data:{id:'selected',status:'new',updatedAt:'new-version'}}});
  await expect(api.markRead({id:'selected',updatedAt:'old-version'})).rejects.toThrow('다른 운영자');
  get.mockResolvedValueOnce({data:{success:true,data:{id:'selected',status:'resolved',updatedAt:'new-version'}}});
  await expect(api.markRead({id:'selected',updatedAt:'old-version'})).resolves.toEqual({skipped:true});
  expect(patch).not.toHaveBeenCalled();
});
