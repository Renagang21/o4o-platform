/**
 * UserRoleChangeModal 컴포넌트 간단 테스트
 * 핵심 기능 검증을 위한 단순화된 테스트
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserRoleChangeModal from '../UserRoleChangeModal';
import { User, UserRole } from '../../../types/user';

describe('UserRoleChangeModal 간단 테스트', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn<[UserRole], void>();
  
  const customerUser: User = {
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
    _isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    users: [customerUser],
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('모달이 올바르게 렌더링된다', () => {
    render(<UserRoleChangeModal {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('사용자 역할 변경')).toBeInTheDocument();
    expect(screen.getByText('1명 사용자 역할을 변경합니다')).toBeInTheDocument();
  });

  it('사용자 정보가 표시된다', () => {
    render(<UserRoleChangeModal {...defaultProps} />);
    
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('(hong@example.com)')).toBeInTheDocument();
  });

  it('역할 선택 옵션들이 표시된다', () => {
    render(<UserRoleChangeModal {...defaultProps} />);
    
    expect(screen.getByText('변경할 역할 선택')).toBeInTheDocument();
    expect(screen.getByText('시스템 관리 권한')).toBeInTheDocument();
    expect(screen.getByText('일반 고객 권한')).toBeInTheDocument();
    expect(screen.getByText('사업자 고객 권한')).toBeInTheDocument();
    expect(screen.getByText('제휴 파트너 권한')).toBeInTheDocument();
  });

  it('역할 선택이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserRoleChangeModal {...defaultProps} />);
    
    // admin 역할 선택
    const adminButton = screen.getByRole('button', { name: /관리자/ });
    await user.click(adminButton);
    
    await waitFor(() => {
      expect(adminButton).toHaveClass('border-blue-500');
    });
  });

  it('확인 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserRoleChangeModal {...defaultProps} />);
    
    // admin 역할 선택
    const adminButton = screen.getByRole('button', { name: /관리자/ });
    await user.click(adminButton);
    
    // 확인 버튼 클릭
    const confirmButton = screen.getByText('역할 변경');
    await user.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledWith('admin');
  });

  it('취소 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserRoleChangeModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('취소');
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('닫기 버튼이 작동한다', async () => {
    const user = userEvent.setup();
    render(<UserRoleChangeModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /닫기/ });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('로딩 상태가 올바르게 표시된다', () => {
    render(<UserRoleChangeModal {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('처리 중...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /닫기/ })).not.toBeInTheDocument();
  });

  it('isOpen이 false일 때 렌더링되지 않는다', () => {
    render(<UserRoleChangeModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('변경 사항이 없을 때 경고가 표시된다', async () => {
    render(<UserRoleChangeModal {...defaultProps} />);
    
    // 같은 역할(customer) 선택 - 기본값이므로 이미 선택됨
    await waitFor(() => {
      expect(screen.getByText(/선택한 사용자들이 모두 이미/)).toBeInTheDocument();
    });
  });

  it('다중 사용자 처리가 작동한다', () => {
    const multipleUsers = [
      customerUser,
      { ...customerUser, id: 'user-2', name: '김철수', role: 'business' as const }
    ];
    
    render(<UserRoleChangeModal {...defaultProps} users={multipleUsers} />);
    
    expect(screen.getByText('2명 사용자 역할을 변경합니다')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });
});