import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import CentralAiReportNotice from './CentralAiReportNotice';

afterEach(cleanup);

it('points to the admin AI operations settings instead of an empty report', () => {
  render(<CentralAiReportNotice />);
  expect(screen.getByRole('link', { name: 'AI 운영 관리 열기' }).getAttribute('href')).toBe('/settings');
  expect(screen.queryByText('분석 데이터 준비 중')).toBeNull();
  expect(screen.getByText(/AI 호출 수 · 오류 · 토큰 사용량 · 추정 비용/)).toBeTruthy();
});
