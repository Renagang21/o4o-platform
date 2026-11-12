import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsultationExpressionSettings } from './ConsultationExpressionSettings';
import { readConsultationExpression, saveConsultationExpression } from '../../../api/consultationWorkspace';
vi.mock('../../../api/consultationWorkspace',()=>({readConsultationExpression:vi.fn(),saveConsultationExpression:vi.fn()}));
const expression={tone:'neutral',formality:'polite',length:'standard'} as const;
const data={organizationId:'a',expression,canEdit:true};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(readConsultationExpression).mockResolvedValue(data);vi.mocked(saveConsultationExpression).mockResolvedValue(data);});
afterEach(cleanup);
describe('store expression',()=>{
 it('saves fixed owner preferences without client role or store authority fields',async()=>{
  render(<ConsultationExpressionSettings organizationId="a"/>);
  const select=await screen.findByLabelText('말투');fireEvent.change(select,{target:{value:'friendly'}});
  fireEvent.click(screen.getByText('매장 표현 설정 저장'));
  await waitFor(()=>expect(saveConsultationExpression).toHaveBeenCalledWith({...expression,tone:'friendly'}));
  await screen.findByText(/표현 설정을 저장했습니다/);
 });
 it('shows approved staff the preferences without editable controls',async()=>{
  vi.mocked(readConsultationExpression).mockResolvedValue({...data,canEdit:false});
  render(<ConsultationExpressionSettings organizationId="a"/>);
  const select=await screen.findByLabelText('말투');expect(select.closest('fieldset')?.disabled).toBe(true);
  expect(saveConsultationExpression).not.toHaveBeenCalled();
 });
 it('ignores a previous store read and save after a store switch',async()=>{
  let finish!:(value:typeof data)=>void;
  vi.mocked(saveConsultationExpression).mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  const view=render(<ConsultationExpressionSettings organizationId="a"/>);
  await screen.findByLabelText('말투');fireEvent.click(screen.getByText('매장 표현 설정 저장'));
  vi.mocked(readConsultationExpression).mockResolvedValue({...data,organizationId:'b',expression:{...expression,tone:'friendly'},canEdit:false});
  view.rerender(<ConsultationExpressionSettings organizationId="b"/>);
  await waitFor(()=>expect((screen.getByLabelText('말투') as HTMLSelectElement).value).toBe('friendly'));
  finish(data);
  await waitFor(()=>expect(screen.queryByText(/표현 설정을 저장했습니다/)).toBeNull());
  expect(screen.getByLabelText('말투').closest('fieldset')?.disabled).toBe(true);
 });
 it('offers retry for failed and mismatched store responses',async()=>{
  vi.mocked(readConsultationExpression).mockResolvedValueOnce({...data,organizationId:'other'});
  render(<ConsultationExpressionSettings organizationId="a"/>);
  fireEvent.click(await screen.findByText('표현 설정 다시 조회'));
  await screen.findByLabelText('말투');expect(readConsultationExpression).toHaveBeenCalledTimes(2);
 });
});
