/**
 * UserDeleteModal 컴포넌트 간단 테스트
 * 핵심 기능 검증을 위한 단순화된 테스트
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserDeleteModal from '../UserDeleteModal';
import { User } from '../../../types/user';

describe('UserDeleteModal 간단 테스트', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  
  const sampleUser: User = {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    role: 'customer',
    status: 'approved',
    phone: '010-1234-5678',
    isEmailVerified: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    users: sampleUser,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('모달이 올바르게 렌더링된다', () => {
    render(<UserDeleteModal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('hong@example.com')).toBeInTheDocument();
  });

  it('닫기 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserDeleteModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /닫기/ });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('삭제 확인 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserDeleteModal {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /사용자 삭제/ });
    await user.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('취소 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserDeleteModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('취소');
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('다중 사용자 삭제에서 정보가 표시된다', () => {
    const multipleUsers = [sampleUser, { ...sampleUser, id: 'user-2', name: '김철수' }];
    render(<UserDeleteModal {...defaultProps} users={multipleUsers} />);
    
    expect(screen.getByText('2명 사용자를 삭제합니다')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });

  it('로딩 상태가 올바르게 표시된다', () => {
    render(<UserDeleteModal {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('삭제 중...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /닫기/ })).not.toBeInTheDocument();
  });

  it('isOpen이 false일 때 렌더링되지 않는다', () => {
    render(<UserDeleteModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('관리자 경고가 표시된다', () => {
    const adminUser = { ...sampleUser, role: 'admin' as const, name: '관리자' };
    render(<UserDeleteModal {...defaultProps} users={adminUser} />);
    
    expect(screen.getByText('추가 주의사항')).toBeInTheDocument();
    expect(screen.getByText('• 관리자 권한을 가진 사용자가 포함되어 있습니다.')).toBeInTheDocument();
  });
});