import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NetureMembershipNotice } from '../NetureMembershipNotice';

describe('Neture membership notice', () => {
  afterEach(cleanup);
  it.each([
    ['none', '가입 정보와 계정 상태를 확인해 주시기 바랍니다'],
    ['pending', '가입 정보·승인 및 계정 상태를 확인해 주시기 바랍니다'],
    ['rejected', 'Neture 가입이 반려되었습니다'],
    ['suspended', 'Neture 이용이 정지된 상태입니다'],
    ['withdrawn', 'Neture 가입이 해지된 상태입니다'],
  ] as const)('%s displays the appropriate membership guidance', (status, title) => {
    render(<NetureMembershipNotice status={status} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.queryByTestId('home-neture-membership-apply')).toBeNull();
    expect(!!screen.queryByRole('link',{name:'가입 정보 확인'})).toBe(['none','pending','rejected'].includes(status));
  });
});
