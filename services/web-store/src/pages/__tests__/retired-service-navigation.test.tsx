import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomePage from '../HomePage';
import { RetiredServiceNotice } from '../../components/layouts/UnifiedStoreLayout';
afterEach(cleanup);
it('종료 서비스 매장이 대표 루트로 진입해도 이용 사업 확인으로 벗어날 수 있다', async () => {
  render(<MemoryRouter><Routes><Route path="/" element={<HomePage />} /><Route path="/store" element={<RetiredServiceNotice />} /><Route path="/services" element={<h1>이용 사업 목록</h1>} /></Routes></MemoryRouter>);
  expect(await screen.findByTestId('store-retired-service')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: '이용 사업 확인' }));
  expect(await screen.findByRole('heading', { name: '이용 사업 목록' })).toBeTruthy();
});
