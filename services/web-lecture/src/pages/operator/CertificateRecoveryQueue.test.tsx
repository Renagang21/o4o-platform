import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const read = vi.hoisted(() => vi.fn());
vi.mock('../../api/lecture', () => ({ operatorApi: { missingCertificates: read }, errorMessage: () => '목록 조회 실패' }));
import { CertificateRecoveryQueue } from './CertificateRecoveryQueue';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('keeps a failed issue in the queue and refreshes after a successful retry', async () => {
 read.mockResolvedValueOnce({ data: { items: [{ enrollmentId: 'enrollment', userId: 'student', courseId: 'course', userName: '합성 학습자', courseTitle: '전문 강의 fixture' }] } }).mockResolvedValue({ data: { items: [] } });
 const issue = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 render(<CertificateRecoveryQueue busy={false} onIssue={issue} />);
 const button = await screen.findByRole('button', { name: '수료증 발급 재시도' }); fireEvent.click(button);
 await waitFor(() => expect(issue).toHaveBeenCalledTimes(1)); expect(read).toHaveBeenCalledTimes(1);
 fireEvent.click(button); await screen.findByText('검색 조건에 해당하는 미발급 수료 건이 없습니다.'); expect(issue).toHaveBeenCalledTimes(2);
});
it('keeps read errors separate from an empty recovery queue and retries the submitted search', async () => {
 read.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { items: [] } });
 render(<CertificateRecoveryQueue busy={false} onIssue={vi.fn()} />);
 await screen.findByRole('alert'); expect(screen.queryByText('검색 조건에 해당하는 미발급 수료 건이 없습니다.')).toBeNull();
 fireEvent.change(screen.getByLabelText('학습자 이름 · 강의 제목 검색'), { target: { value: '전문 강의' } }); fireEvent.click(screen.getByRole('button', { name: '조회 · 새로고침' }));
 await screen.findByText('검색 조건에 해당하는 미발급 수료 건이 없습니다.'); expect(read).toHaveBeenLastCalledWith('전문 강의');
});
