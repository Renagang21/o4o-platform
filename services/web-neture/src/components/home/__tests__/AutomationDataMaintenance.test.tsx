import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AutomationDataMaintenance from '../AutomationDataMaintenance';
afterEach(cleanup);
const props = () => ({ goal: '현재 상품 준비', neededInput: '포장단위가 무엇인가요?', draft: '기존 입력', resuming: true, disabled: false, onApply: vi.fn(), onClose: vi.fn() });
function fill() {
 fireEvent.change(screen.getByLabelText('상품·거래처 또는 작업 대상'), { target: { value: '합성 상품' } });
 fireEvent.change(screen.getByLabelText('확인·수정한 내용'), { target: { value: '500정 포장 2개' } });
}
describe('data maintenance request preparation', () => {
 it('keeps task/question/draft and requires an explicit apply', () => {
  const p=props();render(<AutomationDataMaintenance {...p} />);fill();
  expect(p.onApply).not.toHaveBeenCalled();
  expect(screen.getByText(/포장단위가 무엇인가요/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'입력창에 반영'}));
  const text=p.onApply.mock.calls[0][0];
  for(const value of ['기존 입력','합성 상품','500정 포장 2개','현재 사용자·매장'])expect(text).toContain(value);
 });
 it('offers a question without inventing a value', () => {
  const p=props();render(<AutomationDataMaintenance {...p} />);
  fireEvent.click(screen.getByLabelText('입력할 내용을 몰라 AI에 질문하기'));
  fireEvent.change(screen.getByLabelText('상품·거래처 또는 작업 대상'),{target:{value:'합성 상품'}});
  fireEvent.change(screen.getByLabelText('알고 싶은 내용'),{target:{value:'포장 수량의 의미를 알려 주세요'}});
  fireEvent.click(screen.getByRole('button',{name:'입력창에 반영'}));
  expect(p.onApply.mock.calls[0][0]).toContain('질문: 포장 수량');
 });
 it('does not silently truncate an existing draft', () => {
  const p={...props(),draft:'가'.repeat(1900)};render(<AutomationDataMaintenance {...p} />);fill();
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'입력창에 반영'}));expect(p.onApply).not.toHaveBeenCalled();
  expect(screen.getByLabelText('확인·수정한 내용')).toHaveProperty('value','500정 포장 2개');
 });
 it('keeps long prior task text in context without recursively adding it to the next answer', () => {
  const p={...props(),goal:'이전 답변'.repeat(500),draft:''};render(<AutomationDataMaintenance {...p} />);fill();
  fireEvent.click(screen.getByRole('button',{name:'입력창에 반영'}));expect(p.onApply).toHaveBeenCalledOnce();
  expect(p.onApply.mock.calls[0][0]).not.toContain('이전 답변');
 });
 it('requires an item and details and honors the execution lock', () => {
  const p=props();const view=render(<AutomationDataMaintenance {...p} />);
  expect(screen.getByRole('button',{name:'입력창에 반영'})).toHaveProperty('disabled',true);
  fill();view.rerender(<AutomationDataMaintenance {...p} disabled />);
  expect(screen.getByRole('button',{name:'입력창에 반영'})).toHaveProperty('disabled',true);
 });
});
