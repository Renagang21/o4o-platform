import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminResourceDeletionPage from './AdminResourceDeletionPage';
const fixture=vi.hoisted(()=>({api:{get:vi.fn(),delete:vi.fn()}}));
vi.mock('@o4o/auth-client',()=>({authClient:{api:fixture.api}}));
vi.mock('@o4o/auth-context',()=>({useAuth:()=>({user:{id:'synthetic-admin',roles:['platform:super_admin']}})}));
beforeEach(()=>vi.clearAllMocks());
afterEach(()=>cleanup());
it.each(['community','lecture'])('clicking the confirmed %s final-deletion button executes once and refreshes the list',async(kind)=>{
  let removed=false;
  fixture.api.get.mockImplementation(async(path:string)=>path.endsWith('/deletion-plan')
    ?{data:{data:{digest:'synthetic-digest',counts:{posts:1},blockers:[]}}}
    :{data:{data:removed?[]:[{id:'synthetic-resource',name:'Synthetic resource',title:'Synthetic resource',status:'archived'}],pagination:{totalPages:1}}});
  fixture.api.delete.mockImplementation(async()=>{removed=true;return{data:{data:{applied:true,deleted:true}}};});
  render(<AdminResourceDeletionPage/>);
  if(kind==='lecture')fireEvent.click(screen.getByRole('button',{name:'강의',exact:true}));
  await waitFor(()=>expect(within(screen.getByRole('table')).getByText('Synthetic resource')).toBeTruthy());
  fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button',{name:'최종 삭제 범위 확인'}));
  const run=await screen.findByRole('button',{name:'최종 삭제 실행'});
  expect((run as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('삭제 사유'),{target:{value:'Synthetic selected resource disposal'}});
  fireEvent.click(screen.getByLabelText('대상과 유지·삭제 범위를 확인했습니다.'));
  fireEvent.click(run);
  await waitFor(()=>expect(fixture.api.delete).toHaveBeenCalledTimes(1));
  expect(fixture.api.delete).toHaveBeenCalledWith(kind==='community'?'/communities/community/management/boards/synthetic-resource':'/lms/operator/courses/synthetic-resource/hard',{data:{expectedDigest:'synthetic-digest',reason:'Synthetic selected resource disposal'}});
  await screen.findByText('선택 대상과 연결 자료의 삭제를 완료했습니다.');
  await waitFor(()=>expect(within(screen.getByRole('table')).queryByText('Synthetic resource')).toBeNull());
});
