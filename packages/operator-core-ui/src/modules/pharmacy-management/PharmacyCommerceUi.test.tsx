/**
 * EmptyRow — 기존 안내 행은 그대로, tone="error" 는 조회 실패(목록 없음과 구분) + 선택적 [다시 시도].
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EmptyRow } from './PharmacyCommerceUi';

const inTable = (row: JSX.Element) =>
  render(
    <table>
      <tbody>{row}</tbody>
    </table>,
  );

afterEach(cleanup);

describe('EmptyRow', () => {
  it('기존 호출(colSpan · text)은 회색 안내 · alert 아님 · 버튼 없음', () => {
    inTable(<EmptyRow colSpan={7} text="해당하는 이벤트가 없습니다." />);
    const cell = screen.getByText('해당하는 이벤트가 없습니다.');
    expect(cell.getAttribute('colspan')).toBe('7');
    expect(cell.className).toContain('text-gray-400');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('tone="error" 는 alert 로 보이고 onRetry 를 주면 [다시 시도]가 그것을 부른다', () => {
    const onRetry = vi.fn();
    inTable(<EmptyRow colSpan={5} tone="error" text="목록을 불러오지 못했습니다." onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('목록을 불러오지 못했습니다.');
    expect(alert.className).toContain('text-red-700');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('retryLabel 로 버튼 문구를 바꿀 수 있다', () => {
    inTable(<EmptyRow colSpan={1} tone="error" text="실패" onRetry={() => {}} retryLabel="새로고침" />);
    expect(screen.getByRole('button', { name: '새로고침' })).toBeTruthy();
  });
});
