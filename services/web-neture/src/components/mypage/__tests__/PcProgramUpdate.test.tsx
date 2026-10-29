import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import PcProgramUpdate from '../PcProgramUpdate';
const release={format:'o4o-pc-release-v1',releaseId:'a'.repeat(64),sourceSha:'b'.repeat(40),version:'0.4.0',nodeVersion:'22.18.0',dataSchemaVersion:8,filename:`o4o-pc-connection-${'b'.repeat(12)}-${'a'.repeat(12)}.zip`,sha256:'c'.repeat(64),bytes:20};
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
it('reports an old connected PC as needing update and requires matching running code/data for completion',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>({ok:true,json:async()=>release})));
 const verify=vi.fn(),health={agentVersion:'0.3.0',connected:true,nonce:'fixture'};
 const view=render(<PcProgramUpdate health={health} onVerify={verify}/>);
 await screen.findByText('프로그램 업데이트가 필요해요.');
 expect(screen.queryByText('최신 프로그램입니다.')).toBeNull();
 view.rerender(<PcProgramUpdate health={{...health,agentVersion:'0.4.0',releaseId:release.releaseId,localData:{ready:true,schemaVersion:8}}} onVerify={verify}/>);
 expect(screen.getByText('최신 프로그램입니다.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'연결 상태 확인'}));expect(verify).toHaveBeenCalledOnce();
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));
});
it('unreachable PC is unknown rather than up-to-date; failed manifest can be retried',async()=>{
 const fetcher=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({ok:true,json:async()=>release});vi.stubGlobal('fetch',fetcher);
 render(<PcProgramUpdate health={null} onVerify={vi.fn()}/>);await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'이미 설치했어요 · 연결 확인'}));
 await screen.findByText('버전 0.4.0');expect(screen.queryByText('최신 프로그램입니다.')).toBeNull();
});

it('one install button downloads the verified launcher without claiming installation or connecting automatically',async()=>{
 const {createHash,webcrypto}=await import('node:crypto');
 const payload=new TextEncoder().encode('@echo off\r\nrem synthetic installer');
 const setup={filename:release.filename.replace('.zip','-setup.cmd'),bytes:payload.length,sha256:createHash('sha256').update(payload).digest('hex')};
 vi.stubGlobal('crypto',webcrypto);
 vi.stubGlobal('URL',{createObjectURL:vi.fn().mockReturnValue('blob:fixture'),revokeObjectURL:vi.fn()});
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url:string)=>url.endsWith('release.json')?{ok:true,json:async()=>({...release,setup})}:new Response(payload)));
 const verify=vi.fn();render(<PcProgramUpdate health={null} onVerify={verify}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'설치 파일 받기'}).hasAttribute('disabled')).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'설치 파일 받기'}));
 await screen.findByRole('status');
 expect(click).toHaveBeenCalledOnce();expect(click.mock.instances[0].download).toBe('O4O-PC-Setup.cmd');
 expect(verify).not.toHaveBeenCalled();expect(screen.queryByText('최신 프로그램입니다.')).toBeNull();
 expect(screen.queryByText(/압축을 풀고/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'이미 설치했어요 · 연결 확인'}));expect(verify).toHaveBeenCalledOnce();
 click.mockRestore();
});

async function renderInstaller(probe:()=>Promise<Response>, connect=vi.fn().mockResolvedValue(true)) {
 const {createHash,webcrypto}=await import('node:crypto');
 const payload=new TextEncoder().encode('synthetic setup');
 const next={...release,setup:{filename:release.filename.replace('.zip','-setup.cmd'),sha256:createHash('sha256').update(payload).digest('hex'),bytes:payload.length}};
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('URL',{createObjectURL:vi.fn().mockReturnValue('blob:fixture'),revokeObjectURL:vi.fn()});
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 vi.stubGlobal('fetch',vi.fn().mockImplementation((url:string)=>url.endsWith('release.json')?Promise.resolve({ok:true,json:async()=>next}):url.endsWith('-setup.cmd')?Promise.resolve(new Response(payload)):probe()));
 const view=render(<PcProgramUpdate health={null} onVerify={vi.fn()} onConnectReady={connect}/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:'설치 파일 받기'}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'설치 파일 받기'}));
 await screen.findByText('이제 받은 파일을 열어 주세요.');
 return {view,connect};
}
it('an old running release cannot trigger auto pairing, and stopping prevents further observation',async()=>{
 let count=0;
 const {connect}=await renderInstaller(async()=>{count++;return new Response(JSON.stringify({ok:true,agentVersion:'0.4.0',releaseId:'d'.repeat(64),connected:false,nonce:'synthetic',localData:{ready:true,schemaVersion:8}}))});
 await waitFor(()=>expect(count).toBeGreaterThanOrEqual(2),{timeout:5000});
 expect(connect).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'자동 연결 중지'}));
 const stopped=count;await new Promise(resolve=>setTimeout(resolve,2200));
 expect(count).toBe(stopped);expect(connect).not.toHaveBeenCalled();
});
it('a late successful health response after unmount never starts an account connection',async()=>{
 let resolve!:(value:Response)=>void;
 const probe=vi.fn(()=>new Promise<Response>(done=>{resolve=done}));
 const {view,connect}=await renderInstaller(probe);
 await waitFor(()=>expect(probe).toHaveBeenCalledOnce());view.unmount();
 resolve(new Response(JSON.stringify({ok:true,agentVersion:'0.4.0',releaseId:release.releaseId,connected:false,nonce:'synthetic',localData:{ready:true,schemaVersion:8}})));
 await new Promise(done=>setTimeout(done,20));expect(connect).not.toHaveBeenCalled();
});
