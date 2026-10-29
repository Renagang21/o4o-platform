import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PharmacyOrderPanel from '../PharmacyOrderPanel';
import { loadWorkingData, workDataRequest } from '../../../lib/pharmacy/work-data';
vi.mock('../../../lib/pharmacy/work-data',()=>({loadWorkingData:vi.fn(),workDataRequest:vi.fn()}));
import { PHARMACY_FORMAT } from '../../../lib/pharmacy/order';
afterEach(cleanup);
function addSupplier() {
  fireEvent.change(screen.getByLabelText('새 거래처명'), { target: { value: '합성 거래처' } });
  fireEvent.change(screen.getByLabelText('새 주문 사이트'), { target: { value: 'https://example.com/order' } });
  fireEvent.click(screen.getByRole('button', { name: '거래처 추가' }));
}
function addLine(count = '2') {
  fireEvent.change(screen.getByLabelText('상품명'), { target: { value: '합성 상품' } });
  fireEvent.change(screen.getByLabelText('포장규격'), { target: { value: '500정' } });
  fireEvent.change(screen.getByLabelText('포장 개수'), { target: { value: count } });
  fireEvent.click(screen.getByRole('button', { name: '주문 행 추가' }));
}
describe('pharmacy order preparation', () => {
  it('starts empty without inventory, prepares a request without executing, and requires direct receipt evidence', () => {
    const apply = vi.fn(); render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={apply} />);
    expect(screen.getByText(/OCR은 사용하지/)).toBeTruthy();
    expect(screen.getByRole('button',{name:'화면 자료 내보내기'})).toBeTruthy();expect(screen.queryByRole('button',{name:'전체 자료 내보내기'})).toBeNull();
    expect(screen.getByText(/조회한 이력만 파일에 담아요/)).toBeTruthy();
    addSupplier(); addLine(); fireEvent.click(screen.getByRole('button', { name: '주문 요청 준비' }));
    expect(apply).toHaveBeenCalledOnce(); expect(apply.mock.calls[0][0]).toContain('합성 상품 / 500정 / 2포장');
    expect(apply.mock.calls[0][0]).toContain('최종 제출·결제는 사용자가 직접');
    fireEvent.click(screen.getByRole('button', { name: '상품·규격·수량 준비 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '직접 주문하도록 인계' }));
    expect(screen.getByRole('button', { name: '외부 주문 접수 직접 확인' }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('직접 확인한 외부 접수번호'), { target: { value: 'fixture-receipt' } });
    fireEvent.click(screen.getByRole('button', { name: '외부 주문 접수 직접 확인' }));
    expect(screen.getByText('상태: 외부 접수 직접 확인')).toBeTruthy();
    expect(apply).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '주문 요청 준비' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '새 주문 시트' }));
    expect(screen.getByText('상태: 작성 중')).toBeTruthy();
  });
  it('keeps incomplete lines as draft and asks for package/count instead of guessing', () => {
    const apply = vi.fn(); render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={apply} />);
    addSupplier(); addLine(''); fireEvent.click(screen.getByRole('button', { name: '주문 요청 준비' }));
    expect(apply).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('포장·수량');
    fireEvent.click(screen.getByRole('button', { name: '상품·규격·수량 준비 확인' }));
    expect(screen.getByRole('alert').textContent).toContain('확인이 필요');
    expect(screen.getByText('상태: 작성 중')).toBeTruthy();
  });
  it('edits and deletes lines without marking an order complete, and blocks requests during resume', () => {
    const apply = vi.fn(); render(<PharmacyOrderPanel disabled={false} resuming onApply={apply} />);
    addSupplier(); addLine(); expect(screen.getByRole('button', { name: '주문 요청 준비' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '행 수정' }));
    fireEvent.change(screen.getByLabelText('포장 개수'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '수정 반영' }));
    expect(screen.getByText(/3포장/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '행 삭제' })); expect(screen.queryByRole('button', { name: '행 수정' })).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });
  it('refuses invalid file structure and imports explicit program references with package conversion', async () => {
    render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={vi.fn()} />);
    const records = [
      {kind:'product',data:{id:'p',name:'합성 상품',program:'fixture',program_code:'0001',kind:'dispensing'}},
      {kind:'pack',data:{id:'k',product_id:'p',label:'500정',base_unit:'정',units_per_pack:500}},
      {kind:'supplier',data:{id:'s',name:'합성 거래처',enabled:true,payment_timing:'deferred',payment_required:false}},
      {kind:'sheet',data:{id:'w',title:'시트',status:'draft',lines:[{id:'l',product_id:'p',supplier_id:'s',pack_id:'k',product_name:'합성 상품',pack_label:'500정',pack_count:2}]}},
    ];
    const input = screen.getByLabelText('PC 자료함 JSON 가져오기');
    const file = { size: 1000, text: async () => JSON.stringify({ format: PHARMACY_FORMAT, records }) };
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('= 1000정')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('재고 확인 상품'), { target: { value: 'p' } });
    fireEvent.change(screen.getByLabelText('실물 확인 수량'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('실물 수량 단위'), { target: { value: '정' } });
    expect(screen.getByRole('button', { name: '현재 확인 재고 기록' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByLabelText('실물을 직접 확인했습니다'));
    fireEvent.click(screen.getByRole('button', { name: '현재 확인 재고 기록' }));
    expect(screen.getByText(/실물 확인 \/ 0정/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('합성 상품 주문 가능 여부'), { target: { value: 'unconfirmed' } });
    expect(screen.getByText(/합성 상품: 확인 불가/)).toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('덮어쓰지 않습니다'));
  });
  it('drops an asynchronous file result when its account/scope component unmounts', async () => {
    let finish!: (value: string) => void;
    const delayed = { size: 100, text: () => new Promise<string>(resolve => { finish = resolve; }) };
    const view = render(<PharmacyOrderPanel key="owner-a" disabled={false} resuming={false} onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('PC 자료함 JSON 가져오기'), { target: { files: [delayed] } });
    view.rerender(<PharmacyOrderPanel key="owner-b" disabled={false} resuming={false} onApply={vi.fn()} />);
    finish(JSON.stringify({format:PHARMACY_FORMAT,records:[{kind:'supplier',data:{id:'old',name:'이전 계정',enabled:true,payment_timing:'unknown',payment_required:null}}]}));
    await waitFor(() => expect(screen.queryByText('이전 계정')).toBeNull());
    expect(screen.getByRole('button', {name:'주문 행 추가'}).hasAttribute('disabled')).toBe(true);
  });
});

it('preserves the existing composer draft and refuses overflow without calling onApply', () => {
  const apply = vi.fn(); const view = render(<PharmacyOrderPanel disabled={false} resuming={false} draft="기존 요청" onApply={apply} />);
  addSupplier(); addLine(); fireEvent.click(screen.getByRole('button', { name: '주문 요청 준비' }));
  expect(apply.mock.calls[0][0]).toMatch(/^기존 요청\n외부 거래처/);
  const prepared = apply.mock.calls[0][0];
  view.rerender(<PharmacyOrderPanel disabled={false} resuming={false} draft={prepared} onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: '행 수정' }));
  fireEvent.change(screen.getByLabelText('포장 개수'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 반영' }));
  fireEvent.click(screen.getByRole('button', { name: '주문 요청 준비' }));
  expect(apply.mock.calls[1][0]).toMatch(/^기존 요청\n외부 거래처/);
  expect(apply.mock.calls[1][0]).toContain('3포장');
  expect(apply.mock.calls[1][0]).not.toContain('2포장');
  view.rerender(<PharmacyOrderPanel disabled={false} resuming={false} draft={'가'.repeat(2000)} onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: '주문 요청 준비' }));
  expect(apply).toHaveBeenCalledTimes(2); expect(screen.getByRole('alert').textContent).toContain('기존 입력을 유지');
});

it('keeps the first imported sheet selected when updating it among multiple sheets', async () => {
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={vi.fn()} />);
  const records = [
    {kind:'supplier',data:{id:'s',name:'합성 거래처',enabled:true,payment_timing:'unknown',payment_required:null}},
    {kind:'sheet',data:{id:'first',title:'첫 시트',status:'draft',lines:[{id:'l',supplier_id:'s',product_name:'첫 상품',pack_label:'500정',pack_count:2}]}},
    {kind:'sheet',data:{id:'second',title:'다음 시트',status:'draft',lines:[]}},
  ];
  fireEvent.change(screen.getByLabelText('PC 자료함 JSON 가져오기'), { target: {files:[{size:1000,text:async()=>JSON.stringify({format:PHARMACY_FORMAT,records})}]}});
  await waitFor(()=>expect(screen.getByLabelText('주문 시트')).toHaveProperty('value','first'));
  fireEvent.click(screen.getByRole('button',{name:'상품·규격·수량 준비 확인'}));
  expect(screen.getByLabelText('주문 시트')).toHaveProperty('value','first');
  expect(screen.getByText('상태: 준비 확인')).toBeTruthy(); expect(screen.getByText(/첫 상품 \/ 500정/)).toBeTruthy();
});
it('clears a deleted line editor and allows a replacement to be added without losing input',()=>{
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={vi.fn()}/>);
  addSupplier(); addLine(); fireEvent.click(screen.getByRole('button',{name:'행 수정'}));
  fireEvent.click(screen.getByRole('button',{name:'행 삭제'}));
  expect(screen.queryByRole('button',{name:'수정 반영'})).toBeNull();
  expect(screen.getByLabelText('상품명')).toHaveProperty('value','');
  addLine('3'); expect(screen.getByText(/합성 상품 \/ 500정 \/ 3포장/)).toBeTruthy();
});

it('records receipts per supplier and keeps the unsubmitted supplier available',()=>{
  const apply=vi.fn(); render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={apply}/>);
  addSupplier(); addLine();
  fireEvent.change(screen.getByLabelText('새 거래처명'),{target:{value:'다른 거래처'}});
  fireEvent.click(screen.getByRole('button',{name:'거래처 추가',exact:true})); addLine('3');
  fireEvent.click(screen.getByRole('button',{name:'상품·규격·수량 준비 확인'}));
  fireEvent.click(screen.getByRole('button',{name:'직접 주문하도록 인계'}));
  fireEvent.change(screen.getByLabelText('직접 확인한 외부 접수번호'),{target:{value:'receipt-a'}});
  fireEvent.click(screen.getByRole('button',{name:'외부 주문 접수 직접 확인'}));
  expect(screen.getByText('상태: 사용자에게 인계')).toBeTruthy();
  const a=screen.getByRole('heading',{name:'합성 거래처'}).closest('section')!;
  const b=screen.getByRole('heading',{name:'다른 거래처'}).closest('section')!;
  expect(within(a).getByRole('button',{name:'주문 요청 준비'}).hasAttribute('disabled')).toBe(true);
  expect(within(b).getByRole('button',{name:'주문 요청 준비'}).hasAttribute('disabled')).toBe(false);
  fireEvent.click(within(b).getByRole('button',{name:'주문 요청 준비'})); expect(apply.mock.calls[0][0]).toContain('거래처: 다른 거래처');
  expect(screen.getByLabelText('직접 확인한 외부 접수번호')).toHaveProperty('value','');
  fireEvent.change(screen.getByLabelText('직접 확인한 외부 접수번호'),{target:{value:'receipt-b'}});
  fireEvent.click(screen.getByRole('button',{name:'외부 주문 접수 직접 확인'}));
  expect(screen.getByText('상태: 외부 접수 직접 확인')).toBeTruthy();
  expect(within(b).getByRole('button',{name:'주문 요청 준비'}).hasAttribute('disabled')).toBe(true);
});


describe('connected pharmacy work data',()=>{
 const scope={workspace:'home',capabilities:[],executionMode:'server',status:'ready'} as any;
 const permission={enabled:true,epoch:'fixture-epoch',owner:'user:fixture',updatedAt:null};
 it('autosaves a connected edit, retains it on failure, and retries only on user action',async()=>{
  let fail=true;
  vi.mocked(loadWorkingData).mockResolvedValue({location:'server',consent:permission,records:[],next:null,counts:{},versions:{}});
  vi.mocked(workDataRequest).mockImplementation(async(action)=>{
    if(action==='status')return permission as any;
    if(action==='method-sharing')return {enabled:false} as any;
    if(action==='save'){if(fail)throw Error('합성 저장 실패');return {accepted:[]} as any;}
    return {} as any;
  });
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={()=>{}} workScope={scope}/>);
  fireEvent.click(screen.getByRole('button',{name:'PC·서버 자료 불러오기'}));
  await screen.findByText(/서버 자료를 불러왔어요/);
  addSupplier();await screen.findByRole('alert');expect(screen.getByText(/입력한 내용은 유지/)).toBeTruthy();
  expect(screen.getByText('합성 거래처',{selector:'legend'})).toBeTruthy();
  const attempts=vi.mocked(workDataRequest).mock.calls.filter(call=>call[0]==='save').length;
  await new Promise(resolve=>setTimeout(resolve,800));expect(vi.mocked(workDataRequest).mock.calls.filter(call=>call[0]==='save')).toHaveLength(attempts);
  fail=false;fireEvent.click(screen.getByRole('button',{name:'자료 저장'}));await screen.findByText('저장했어요.');
 });
 it('retains conflicted edits until explicit discard and allows reloading without refresh',async()=>{
  vi.mocked(loadWorkingData).mockResolvedValue({location:'server',consent:permission,records:[],next:null,counts:{},versions:{}});
  vi.mocked(workDataRequest).mockImplementation(async(action)=>{
    if(action==='status')return permission as any;
    if(action==='method-sharing')return {enabled:false} as any;
    if(action==='save')throw Error('WORK_DATA_CONFLICT');
    return {} as any;
  });
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={()=>{}} workScope={scope}/>);
  fireEvent.click(screen.getByRole('button',{name:'PC·서버 자료 불러오기'}));await screen.findByText(/서버 자료를 불러왔어요/);
  addSupplier();await screen.findByRole('alert');
  expect(screen.getByText('합성 거래처',{selector:'legend'})).toBeTruthy();
  vi.mocked(loadWorkingData).mockRejectedValueOnce(Error('합성 재조회 실패'));
  fireEvent.click(screen.getByRole('button',{name:'수정 취소하고 최신 자료 불러오기'}));await screen.findByText('합성 재조회 실패');
  expect(screen.getByText('합성 거래처',{selector:'legend'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'수정 취소하고 최신 자료 불러오기'}));await screen.findByText(/서버 자료를 불러왔어요/);
  expect(screen.queryByText('합성 거래처',{selector:'legend'})).toBeNull();
  expect(screen.queryByRole('button',{name:'수정 취소하고 최신 자료 불러오기'})).toBeNull();
 });
 it('restores mixed files in bounded sequential requests bound to one PC and owner',async()=>{
  const deviceId='44444444-4444-4444-8444-444444444444';
  const records=[{kind:'product',data:{id:'p',name:'합성 상품',program:'fixture',program_code:'001',kind:'dispensing'}},{kind:'stock',data:{id:'st',product_id:'p',quantity:null,confidence:'unknown',observed_at:'2026-10-29T00:00:00Z'},origin:{program:'fixture',source_key:'st',collected_at:'2026-10-29T00:00:00Z'}}];
  for(let i=0;i<1001;i++)records.push({kind:'product',data:{id:'extra'+i,name:'추가 상품',program:'fixture',program_code:'extra'+i,kind:'dispensing'}} as any);
  let revision=7;
  vi.mocked(workDataRequest).mockClear();
  vi.mocked(workDataRequest).mockImplementation(async(action)=>{
    if(action==='status')return permission as any;
    if(action==='method-sharing')return {enabled:false} as any;
    if(action==='pc-read')return {revision:7,deviceId,owner:permission.owner} as any;
    if(action==='save')return {revision:++revision,deviceId,owner:permission.owner} as any;
    return {} as any;
  });
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={()=>{}} workScope={scope}/>);
  fireEvent.change(screen.getByLabelText('PC 자료함 JSON 가져오기'),{target:{files:[{size:1000,text:async()=>JSON.stringify({format:PHARMACY_FORMAT,records})}]}});
  await screen.findByText(/파일을 미리 보고 있어요/);
  fireEvent.click(screen.getByRole('button',{name:'현재 자료를 PC에 보관'}));await screen.findByText(/PC에 저장했어요/);
  const saves=vi.mocked(workDataRequest).mock.calls.filter(call=>call[0]==='save');
  expect(saves).toHaveLength(2);for(const [index,call] of saves.entries()){expect(call[2]).toMatchObject({mode:'restore',expectedRevision:7+index,deviceId,expectedOwner:permission.owner});expect((call[2] as any).records.length).toBeLessThanOrEqual(1000);}
  expect(saves.flatMap(call=>(call[2] as any).records)).toEqual(expect.arrayContaining(records));
 });
 it('keeps the editor usable and queues a later edit while the first save is in flight',async()=>{
  let release!:()=>void;let saves=0;
  vi.mocked(workDataRequest).mockClear();
  vi.mocked(loadWorkingData).mockResolvedValue({location:'server',consent:permission,records:[],next:null,counts:{},versions:{}});
  vi.mocked(workDataRequest).mockImplementation(async(action)=>{
    if(action==='status')return permission as any;
    if(action==='method-sharing')return {enabled:false} as any;
    if(action==='save'){saves++;if(saves===1)await new Promise<void>(resolve=>{release=resolve;});return {accepted:[]} as any;}
    return {} as any;
  });
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={()=>{}} workScope={scope}/>);
  fireEvent.click(screen.getByRole('button',{name:'PC·서버 자료 불러오기'}));await screen.findByText(/서버 자료를 불러왔어요/);
  addSupplier();await waitFor(()=>expect(saves).toBe(1));
  expect(screen.getByLabelText('새 거래처명').hasAttribute('disabled')).toBe(false);
  fireEvent.change(screen.getByLabelText('새 거래처명'),{target:{value:'다음 합성 거래처'}});
  fireEvent.click(screen.getByRole('button',{name:'거래처 추가'}));release();
  await waitFor(()=>expect(saves).toBe(2),{timeout:3000});
  expect(screen.getByText('다음 합성 거래처',{selector:'legend'})).toBeTruthy();
  const writes=vi.mocked(workDataRequest).mock.calls.filter(call=>call[0]==='save');
  expect((writes[1][2]?.changes as any[]).map(row=>row.entry.data.name)).toEqual(['다음 합성 거래처']);
 });
 it('reloads saved stock and availability through bounded history pages',async()=>{
  vi.mocked(workDataRequest).mockClear();
  const product={kind:'product',data:{id:'p1',name:'합성 상품',program:'fixture',program_code:'001',kind:'dispensing'}};
  vi.mocked(loadWorkingData).mockResolvedValue({location:'server',consent:permission,records:[product,{kind:'supplier',data:{id:'s1',name:'합성 거래처',enabled:true,payment_timing:'unknown',payment_required:null}},{kind:'pack',data:{id:'k1',product_id:'p1',label:'100정',base_unit:'정',units_per_pack:100,preferred:true}}] as any,next:null,counts:{stock:2,availability:1},versions:{}});
  vi.mocked(workDataRequest).mockImplementation(async(action,_scope,body)=>{
    if(action==='status')return permission as any;
    if(action==='method-sharing')return {enabled:false} as any;
    if(action==='read')return {location:'server',consent:permission,records:body?.kind==='stock'?[{kind:'stock',data:{id:body.after?'stock2':'stock1',product_id:'p1',quantity:body.after?20:10,unit:'정',confidence:'confirmed',observed_at:'2026-10-29T00:00:00Z'}}]:[{kind:'availability',data:{id:'av1',product_id:'p1',supplier_id:'s1',pack_id:'k1',state:'out_of_stock',source:'user_observed',observed_at:'2026-10-29T00:00:00Z'}}],versions:{},next:body?.kind==='stock'&&!body.after?'stock:stock1':null,counts:{}} as any;
    return {} as any;
  });
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={()=>{}} workScope={scope}/>);
  fireEvent.click(screen.getByRole('button',{name:'PC·서버 자료 불러오기'}));await screen.findByText(/서버 자료를 불러왔어요/);
  fireEvent.click(screen.getByRole('button',{name:'이력 다시 조회'}));
  await screen.findByText(/실물 확인 \/ 10정/);await screen.findByText(/합성 상품: 품절 \/ 합성 거래처/);
  fireEvent.click(screen.getByRole('button',{name:'이력 더 보기'}));await screen.findByText(/실물 확인 \/ 20정/);
  expect(vi.mocked(workDataRequest).mock.calls.filter(call=>call[0]==='read').every(call=>call[2]?.limit===100)).toBe(true);
  expect(vi.mocked(workDataRequest).mock.calls.filter(call=>call[0]==='read'&&call[2]?.kind==='availability')).toHaveLength(1);
 });
 it('keeps business mirroring and method sharing as separate explicit choices',async()=>{
  vi.mocked(workDataRequest).mockClear();
  vi.mocked(workDataRequest).mockImplementation(async(action,_scope,body)=>action==='status'?{...permission,enabled:false} as any:action==='consent'?{...permission,enabled:body?.enabled} as any:{enabled:false} as any);
  render(<PharmacyOrderPanel disabled={false} resuming={false} onApply={()=>{}} workScope={scope}/>);
  await waitFor(()=>expect(vi.mocked(workDataRequest).mock.calls.some(call=>call[0]==='status')).toBe(true));
  expect(vi.mocked(workDataRequest).mock.calls.some(call=>call[0]==='consent')).toBe(false);
  fireEvent.click(screen.getByLabelText('어디서나 이용하도록 업무 자료를 서버에도 보관'));
  await waitFor(()=>expect(vi.mocked(workDataRequest).mock.calls.some(call=>call[0]==='consent'&&call[2]?.enabled===true)).toBe(true));
  expect(vi.mocked(workDataRequest).mock.calls.some(call=>call[0]==='method-sharing'&&call[2]?.enabled===true)).toBe(false);
 });
});
