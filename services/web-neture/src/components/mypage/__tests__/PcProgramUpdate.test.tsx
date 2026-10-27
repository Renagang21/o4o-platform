import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import PcProgramUpdate from '../PcProgramUpdate';
const release={format:'o4o-pc-release-v1',releaseId:'a'.repeat(64),sourceSha:'b'.repeat(40),version:'0.4.0',nodeVersion:'22.18.0',dataSchemaVersion:8,filename:`o4o-pc-connection-${'b'.repeat(12)}-${'a'.repeat(12)}.zip`,sha256:'c'.repeat(64),bytes:20};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('reports an old connected PC as needing update and requires matching running code/data for completion',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>({ok:true,json:async()=>release})));
 const verify=vi.fn(),health={agentVersion:'0.3.0',connected:true,nonce:'fixture'};
 const view=render(<PcProgramUpdate health={health} onVerify={verify}/>);
 await screen.findByText('현재 실행 중인 프로그램은 업데이트가 필요합니다.');
 expect(screen.queryByText('최신 프로그램과 데이터 준비 상태를 확인했습니다.')).toBeNull();
 view.rerender(<PcProgramUpdate health={{...health,agentVersion:'0.4.0',releaseId:release.releaseId,localData:{ready:true,schemaVersion:8}}} onVerify={verify}/>);
 expect(screen.getByText('최신 프로그램과 데이터 준비 상태를 확인했습니다.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'설치·업데이트 후 다시 확인'}));expect(verify).toHaveBeenCalledOnce();
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));
});
it('unreachable PC is unknown rather than up-to-date; failed manifest can be retried',async()=>{
 const fetcher=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({ok:true,json:async()=>release});vi.stubGlobal('fetch',fetcher);
 render(<PcProgramUpdate health={null} onVerify={vi.fn()}/>);await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'설치·업데이트 후 다시 확인'}));
 await screen.findByText('배포 버전 0.4.0');expect(screen.queryByText('최신 프로그램과 데이터 준비 상태를 확인했습니다.')).toBeNull();
});
