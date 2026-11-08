import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SupplierProfileChecklist from '../profile/SupplierProfileChecklist';

afterEach(cleanup);

it('shows overall completion only when both profile and settlement results are known and empty', () => {
  render(<SupplierProfileChecklist missingProfileFields={[]} missingSettlementFields={[]} />);
  expect(screen.getByText('필수 항목을 모두 입력했습니다.')).toBeTruthy();
  expect(screen.queryByTestId('supplier-checklist-unchecked')).toBeNull();
});

it('does not claim completion when the settlement result is unknown (Codex P2)', () => {
  render(<SupplierProfileChecklist missingProfileFields={[]} />);
  expect(screen.queryByText('필수 항목을 모두 입력했습니다.')).toBeNull();
  expect(screen.getByText('공급자 정보 필수 항목은 모두 입력했습니다.')).toBeTruthy();
  expect(screen.getByTestId('supplier-checklist-unchecked').textContent).toContain('정산 항목은 확인하지 못했습니다');
});

it('does not claim completion when only the settlement result is known', () => {
  render(<SupplierProfileChecklist missingSettlementFields={[]} />);
  expect(screen.queryByText('필수 항목을 모두 입력했습니다.')).toBeNull();
  expect(screen.getByText('정산 필수 항목은 모두 입력했습니다.')).toBeTruthy();
  expect(screen.getByTestId('supplier-checklist-unchecked').textContent).toContain('공급자 정보 항목은 확인하지 못했습니다');
});

it('lists missing profile fields and still marks the unknown settlement area', () => {
  render(<SupplierProfileChecklist missingProfileFields={['managerName']} />);
  expect(screen.getByText('아직 입력하지 않은 필수 항목 1개')).toBeTruthy();
  expect(screen.getByTestId('supplier-checklist-unchecked').textContent).toContain('정산');
});

it('renders nothing when neither result is available', () => {
  const { container } = render(<SupplierProfileChecklist />);
  expect(container.innerHTML).toBe('');
});
