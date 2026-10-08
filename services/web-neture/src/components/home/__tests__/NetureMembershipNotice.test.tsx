import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NetureMembershipNotice } from '../NetureMembershipNotice';

describe('Neture email confirmation notice', () => {
  afterEach(cleanup);
  it.each([
    ['none', '이메일 확인이 필요합니다'],
    ['pending', '이메일 또는 계정 상태를 확인해 주세요'],
    ['rejected', 'Neture 가입이 반려되었습니다'],
    ['suspended', 'Neture 이용이 정지된 상태입니다'],
    ['withdrawn', 'Neture 가입이 해지된 상태입니다'],
  ] as const)('%s displays account guidance without a manual application', (status, title) => {
    render(<NetureMembershipNotice status={status} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.queryByTestId('home-neture-membership-apply')).toBeNull();
  });
});
