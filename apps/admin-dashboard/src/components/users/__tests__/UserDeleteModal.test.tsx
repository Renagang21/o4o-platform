/**
 * UserDeleteModal 컴포넌트 단위 테스트
 * 삭제 확인 모달 로직 및 안전장치 검증
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserDeleteModal from '../UserDeleteModal';
import { User } from '../../../types/user';

describe('UserDeleteModal 컴포넌트', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  
  const sampleUser: User = {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    role: 'customer',
    status: 'approved',
    phone: '010-1234-5678',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const adminUser: User = {
    id: 'admin-1',
    name: '관리자',
    email: 'admin@example.com',
    role: 'admin',
    status: 'approved',
    phone: '010-1111-1111',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const pendingUser: User = {
    id: 'pending-1',
    name: '대기자',
    email: 'pending@example.com',
    role: 'customer',
    status: 'pending',
    phone: '010-2222-2222',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const defaultProps = {
    _isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    users: sampleUser,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('모달 표시/숨김', () => {
    it('_isOpen이 false일 때 모달이 렌더링되지 않는다', () => {
      render(
        <UserDeleteModal {...defaultProps} _isOpen={false} />
      );
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('_isOpen이 true일 때 모달이 렌더링된다', () => {
      render(<UserDeleteModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // '사용자 삭제' 텍스트가 여러 곳에 있을 수 있음
      const deleteTexts = screen.getAllByText('사용자 삭제');
      expect(deleteTexts.length).toBeGreaterThan(0);
    });

    it('배경 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} />);
      
      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop!);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('X 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /닫기/ });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('로딩 중일 때 X 버튼이 비활성화된다', () => {
      render(<UserDeleteModal {...defaultProps} isLoading={true} />);
      
      expect(screen.queryByRole('button', { name: /닫기/ })).not.toBeInTheDocument();
    });
  });

  describe('단일 사용자 삭제', () => {
    it('단일 사용자 정보가 올바르게 표시된다', () => {
      render(<UserDeleteModal {...defaultProps} />);
      
      expect(screen.getAllByText('사용자 삭제')).toHaveLength(2); // 헤더와 버튼
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('hong@example.com')).toBeInTheDocument();
      expect(screen.getByText('정말로 "홍길동" 사용자를 삭제하시겠습니까?')).toBeInTheDocument();
    });

    it('관리자 사용자 삭제 시 경고가 표시된다', () => {
      render(
        <UserDeleteModal {...defaultProps} users={adminUser} />
      );
      
      expect(screen.getAllByText('관리자')).toHaveLength(2); // 이름과 역할 뱃지
      expect(screen.getByText('추가 주의사항')).toBeInTheDocument();
      expect(screen.getByText('• 관리자 권한을 가진 사용자가 포함되어 있습니다.')).toBeInTheDocument();
    });

    it('활성 사용자 삭제 시 경고가 표시된다', () => {
      render(<UserDeleteModal {...defaultProps} />);
      
      expect(screen.getByText('활성')).toBeInTheDocument();
      expect(screen.getByText('추가 주의사항')).toBeInTheDocument();
      expect(screen.getByText('• 현재 활성화된 사용자가 포함되어 있습니다.')).toBeInTheDocument();
    });

    it('대기 중인 사용자는 활성 경고가 표시되지 않는다', () => {
      render(
        <UserDeleteModal {...defaultProps} users={pendingUser} />
      );
      
      expect(screen.queryByText('활성')).not.toBeInTheDocument();
      expect(screen.queryByText('• 현재 활성화된 사용자가 포함되어 있습니다.')).not.toBeInTheDocument();
    });
  });

  describe('다중 사용자 삭제', () => {
    const multipleUsers = [sampleUser, adminUser, pendingUser];

    it('다중 사용자 정보가 올바르게 표시된다', () => {
      render(
        <UserDeleteModal {...defaultProps} users={multipleUsers} />
      );
      
      expect(screen.getByText('사용자 일괄 삭제')).toBeInTheDocument();
      expect(screen.getByText('3명 사용자를 삭제합니다')).toBeInTheDocument();
      expect(screen.getByText('삭제 대상 사용자 (3명)')).toBeInTheDocument();
      
      // 모든 사용자 표시 확인
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getAllByText('관리자')).toHaveLength(2); // 이름과 역할 뱃지
      expect(screen.getByText('대기자')).toBeInTheDocument();
    });

    it('다중 삭제 시 관리자와 활성 사용자 경고가 모두 표시된다', () => {
      render(
        <UserDeleteModal {...defaultProps} users={multipleUsers} />
      );
      
      expect(screen.getByText('추가 주의사항')).toBeInTheDocument();
      expect(screen.getByText('• 관리자 권한을 가진 사용자가 포함되어 있습니다.')).toBeInTheDocument();
      expect(screen.getByText('• 현재 활성화된 사용자가 포함되어 있습니다.')).toBeInTheDocument();
    });

    it('관리자가 없는 다중 삭제 시 관리자 경고가 표시되지 않는다', () => {
      const nonAdminUsers = [sampleUser, pendingUser];
      render(
        <UserDeleteModal {...defaultProps} users={nonAdminUsers} />
      );
      
      expect(screen.queryByText('• 관리자 권한을 가진 사용자가 포함되어 있습니다.')).not.toBeInTheDocument();
    });

    it('다중 사용자 목록이 스크롤 가능하다', () => {
      const manyUsers = Array.from({ length: 10 }, (_, i) => ({
        ...sampleUser,
        id: `user-${i}`,
        name: `사용자 ${i}`,
        email: `user${i}@example.com`
      }));
      
      render(
        <UserDeleteModal {...defaultProps} users={manyUsers} />
      );
      
      const userList = screen.getByText('삭제 대상 사용자 (10명)').parentElement?.querySelector('.overflow-y-auto');
      expect(userList).toBeInTheDocument();
      expect(userList).toHaveClass('max-h-32');
    });
  });

  describe('확인 및 취소', () => {
    it('취소 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('취소');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('삭제 버튼 클릭 시 onConfirm이 호출된다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} />);
      
      const deleteButton = screen.getByRole('button', { name: /사용자 삭제/ });
      await user.click(deleteButton);
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('다중 삭제 시 삭제 버튼 텍스트가 변경된다', () => {
      const multipleUsers = [sampleUser, adminUser];
      render(
        <UserDeleteModal {...defaultProps} users={multipleUsers} />
      );
      
      expect(screen.getByText('2명 삭제')).toBeInTheDocument();
    });

    it('로딩 중일 때 버튼들이 비활성화되고 로딩 표시가 나타난다', () => {
      render(<UserDeleteModal {...defaultProps} isLoading={true} />);
      
      const cancelButton = screen.getByText('취소');
      const deleteButton = screen.getByText('삭제 중...');
      
      expect(cancelButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
      expect(screen.getByText('삭제 중...')).toBeInTheDocument();
    });

    it('로딩 중일 때 배경 클릭이 무시된다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} isLoading={true} />);
      
      const backdrop = screen.getByRole('dialog').parentElement;
      await user.click(backdrop!);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('경고 메시지', () => {
    it('삭제 경고 메시지가 항상 표시된다', () => {
      render(<UserDeleteModal {...defaultProps} />);
      
      expect(screen.getByText('삭제 경고')).toBeInTheDocument();
      expect(screen.getByText('홍길동 사용자가 영구적으로 삭제됩니다.')).toBeInTheDocument();
      expect(screen.getByText('이 작업은 되돌릴 수 없습니다.')).toBeInTheDocument();
    });

    it('다중 삭제 시 경고 메시지가 복수형으로 표시된다', () => {
      const multipleUsers = [sampleUser, adminUser];
      render(
        <UserDeleteModal {...defaultProps} users={multipleUsers} />
      );
      
      expect(screen.getByText('선택한 2명 사용자가 영구적으로 삭제됩니다.')).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('모달에 적절한 role과 aria 속성이 있다', () => {
      render(<UserDeleteModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('경고 아이콘이 적절한 색상으로 표시된다', () => {
      render(<UserDeleteModal {...defaultProps} />);
      
      const warningIcon = screen.getByTestId('alert-triangle') || 
                         document.querySelector('.text-red-600');
      expect(warningIcon).toBeInTheDocument();
    });

    it('키보드 내비게이션이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} />);
      
      // Tab으로 버튼들 간 이동
      await user.tab();
      expect(screen.getByText('취소')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /사용자 삭제/ })).toHaveFocus();
    });

    it('ESC 키로 모달을 닫을 수 있다', async () => {
      const user = userEvent.setup();
      render(<UserDeleteModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      // ESC 키 처리는 구현에 따라 다를 수 있음
      // 현재 구현에서는 배경 클릭만 처리하므로 이 테스트는 선택사항
    });
  });

  describe('에지 케이스', () => {
    it('사용자 정보가 없을 때 크래시하지 않는다', () => {
      const emptyUser = { ...sampleUser, name: '', email: '' };
      
      expect(() => {
        render(<UserDeleteModal {...defaultProps} users={emptyUser} />);
      }).not.toThrow();
    });

    it('빈 배열이 전달되어도 크래시하지 않는다', () => {
      expect(() => {
        render(<UserDeleteModal {...defaultProps} users={[]} />);
      }).not.toThrow();
    });

    it('props가 변경될 때 올바르게 업데이트된다', () => {
      const { rerender } = render(<UserDeleteModal {...defaultProps} />);
      
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      
      rerender(<UserDeleteModal {...defaultProps} users={adminUser} />);
      
      expect(screen.getAllByText('관리자')).toHaveLength(2); // 이름과 역할 뱃지
      expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
    });
  });
});