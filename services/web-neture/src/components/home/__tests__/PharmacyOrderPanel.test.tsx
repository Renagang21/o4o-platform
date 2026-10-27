import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PharmacyOrderPanel from '../PharmacyOrderPanel';
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
  view.rerender(<PharmacyOrderPanel disabled={false} resuming={false} draft={'가'.repeat(2000)} onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: '주문 요청 준비' }));
  expect(apply).toHaveBeenCalledOnce(); expect(screen.getByRole('alert').textContent).toContain('기존 입력을 유지');
});
