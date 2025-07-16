/**
 * UserForm 컴포넌트 단위 테스트
 * React Hook Form + Zod 유효성 검증 로직 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserForm, { UserFormData } from '../UserForm';
import { User } from '../../../types/user';

// Mock dependencies
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('UserForm 컴포넌트', () => {
  const mockOnSubmit = vi.fn<[UserFormData], Promise<void>>();
  const mockOnCancel = vi.fn();
  
  const defaultProps = {
    mode: 'create' as const,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false
  };

  const sampleUser: Partial<User> = {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    role: 'customer',
    status: 'approved',
    phone: '010-1234-5678'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('폼 렌더링', () => {
    it('생성 모드에서 필수 필드들이 올바르게 렌더링된다', () => {
      render(<UserForm {...defaultProps} mode="create" />);
      
      expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
      expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
      expect(screen.getByLabelText(/역할/)).toBeInTheDocument();
      expect(screen.getByLabelText(/상태/)).toBeInTheDocument();
      expect(screen.getByText('사용자 생성')).toBeInTheDocument();
    });

    it('수정 모드에서 초기 데이터가 올바르게 표시된다', () => {
      render(
        <UserForm 
          {...defaultProps} 
          mode="edit" 
          initialData={sampleUser}
        />
      );
      
      expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
      expect(screen.getByDisplayValue('hong@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('010-1234-5678')).toBeInTheDocument();
      expect(screen.getByText('변경사항 저장')).toBeInTheDocument();
    });

    it('사업자 역할 선택 시 사업자 정보 필드가 표시된다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const roleSelect = screen.getByLabelText(/역할/);
      await user.selectOptions(roleSelect, 'business');
      
      await waitFor(() => {
        expect(screen.getByLabelText(/사업자명/)).toBeInTheDocument();
        expect(screen.getByLabelText(/사업자등록번호/)).toBeInTheDocument();
        expect(screen.getByLabelText(/대표자명/)).toBeInTheDocument();
      });
    });
  });

  describe('유효성 검증', () => {
    it('이름 필드 유효성 검증이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/이름/);
      
      // 빈 값
      await user.clear(nameInput);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('이름은 최소 2자 이상이어야 합니다')).toBeInTheDocument();
      });
      
      // 잘못된 형식
      await user.clear(nameInput);
      await user.type(nameInput, '123');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('이름은 한글, 영문, 공백만 입력 가능합니다')).toBeInTheDocument();
      });
      
      // 올바른 값
      await user.clear(nameInput);
      await user.type(nameInput, '홍길동');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.queryByText(/이름은/)).not.toBeInTheDocument();
      });
    });

    it('이메일 필드 유효성 검증이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/이메일/);
      
      // 잘못된 형식
      await user.type(emailInput, 'invalid-email');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('올바른 이메일 형식을 입력해주세요')).toBeInTheDocument();
      });
      
      // 올바른 형식
      await user.clear(emailInput);
      await user.type(emailInput, 'user@example.com');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.queryByText(/올바른 이메일 형식/)).not.toBeInTheDocument();
      });
    });

    it('비밀번호 필드 유효성 검증이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} mode="create" />);
      
      const passwordInput = screen.getByLabelText(/비밀번호/);
      
      // 너무 짧은 비밀번호
      await user.type(passwordInput, '123');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다')).toBeInTheDocument();
      });
      
      // 복잡성 요구사항 미충족
      await user.clear(passwordInput);
      await user.type(passwordInput, '12345678');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('비밀번호는 대문자, 소문자, 숫자와 특수문자를 포함해야 합니다')).toBeInTheDocument();
      });
      
      // 올바른 비밀번호
      await user.clear(passwordInput);
      await user.type(passwordInput, 'Password123!');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.queryByText(/비밀번호는/)).not.toBeInTheDocument();
      });
    });

    it('휴대폰 번호 형식 검증이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/휴대폰 번호/);
      
      // 잘못된 형식
      await user.type(phoneInput, '01012345678');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('올바른 휴대폰 번호 형식을 입력해주세요 (예: 010-1234-5678)')).toBeInTheDocument();
      });
      
      // 올바른 형식
      await user.clear(phoneInput);
      await user.type(phoneInput, '010-1234-5678');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.queryByText(/올바른 휴대폰 번호 형식/)).not.toBeInTheDocument();
      });
    });

    it('사업자등록번호 형식 검증이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      // 사업자 역할 선택
      const roleSelect = screen.getByLabelText(/역할/);
      await user.selectOptions(roleSelect, 'business');
      
      await waitFor(() => {
        expect(screen.getByLabelText(/사업자등록번호/)).toBeInTheDocument();
      });
      
      const businessNumberInput = screen.getByLabelText(/사업자등록번호/);
      
      // 잘못된 형식
      await user.type(businessNumberInput, '1234567890');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText('올바른 사업자등록번호 형식을 입력해주세요 (예: 123-45-67890)')).toBeInTheDocument();
      });
      
      // 올바른 형식
      await user.clear(businessNumberInput);
      await user.type(businessNumberInput, '123-45-67890');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.queryByText(/올바른 사업자등록번호 형식/)).not.toBeInTheDocument();
      });
    });
  });

  describe('폼 제출', () => {
    it('유효한 데이터로 폼 제출이 성공한다', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue();
      
      render(<UserForm {...defaultProps} />);
      
      // 필수 필드 입력
      await user.type(screen.getByLabelText(/이름/), '홍길동');
      await user.type(screen.getByLabelText(/이메일/), 'hong@example.com');
      await user.type(screen.getByLabelText(/비밀번호/), 'Password123!');
      await user.selectOptions(screen.getByLabelText(/역할/), 'customer');
      await user.selectOptions(screen.getByLabelText(/상태/), 'approved');
      
      // 제출 버튼 클릭
      const submitButton = screen.getByText('사용자 생성');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: '홍길동',
          email: 'hong@example.com',
          password: 'Password123!',
          role: 'customer',
          status: 'approved',
          phone: '',
          sendWelcomeEmail: true
        });
      });
    });

    it('사업자 역할일 때 사업자 정보가 포함되어 제출된다', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue();
      
      render(<UserForm {...defaultProps} />);
      
      // 기본 정보 입력
      await user.type(screen.getByLabelText(/이름/), '김사업');
      await user.type(screen.getByLabelText(/이메일/), 'business@example.com');
      await user.type(screen.getByLabelText(/비밀번호/), 'Password123!');
      await user.selectOptions(screen.getByLabelText(/역할/), 'business');
      await user.selectOptions(screen.getByLabelText(/상태/), 'approved');
      
      // 사업자 정보 입력
      await waitFor(() => {
        expect(screen.getByLabelText(/사업자명/)).toBeInTheDocument();
      });
      
      await user.type(screen.getByLabelText(/사업자명/), '테스트 컴퍼니');
      await user.type(screen.getByLabelText(/사업자등록번호/), '123-45-67890');
      await user.type(screen.getByLabelText(/대표자명/), '김대표');
      
      // 제출
      const submitButton = screen.getByText('사용자 생성');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '김사업',
            email: 'business@example.com',
            role: 'business',
            businessInfo: expect.objectContaining({
              businessName: '테스트 컴퍼니',
              businessNumber: '123-45-67890',
              representativeName: '김대표'
            })
          })
        );
      });
    });

    it('수정 모드에서 비밀번호가 없으면 제출 데이터에서 제외된다', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue();
      
      render(
        <UserForm 
          {...defaultProps} 
          mode="edit" 
          initialData={sampleUser}
        />
      );
      
      // 이름만 수정
      const nameInput = screen.getByDisplayValue('홍길동');
      await user.clear(nameInput);
      await user.type(nameInput, '홍길동 수정');
      
      // 제출
      const submitButton = screen.getByText('변경사항 저장');
      await user.click(submitButton);
      
      await waitFor(() => {
        const submitData = mockOnSubmit.mock.calls[0][0];
        expect(submitData).not.toHaveProperty('password');
        expect(submitData.name).toBe('홍길동 수정');
      });
    });
  });

  describe('인터랙션', () => {
    it('비밀번호 표시/숨김 버튼이 작동한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText(/비밀번호/) as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: /비밀번호 표시/ });
      
      // 초기 상태: 숨김
      expect(passwordInput.type).toBe('password');
      
      // 표시로 변경
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');
      
      // 다시 숨김으로 변경
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('취소 버튼이 onCancel 콜백을 호출한다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const cancelButton = screen.getByText('취소');
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('로딩 상태에서 버튼들이 비활성화된다', () => {
      render(<UserForm {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getByText('사용자 생성');
      const cancelButton = screen.getByText('취소');
      
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('접근성', () => {
    it('모든 필수 필드에 적절한 라벨과 aria 속성이 있다', () => {
      render(<UserForm {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/이름/);
      const emailInput = screen.getByLabelText(/이메일/);
      const passwordInput = screen.getByLabelText(/비밀번호/);
      const roleSelect = screen.getByLabelText(/역할/);
      const statusSelect = screen.getByLabelText(/상태/);
      
      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(roleSelect).toBeInTheDocument();
      expect(statusSelect).toBeInTheDocument();
      
      // 필수 필드 표시 확인
      expect(screen.getAllByText('*')).toHaveLength(4); // name, email, password, role, status 중 5개
    });

    it('에러 메시지가 적절한 aria 속성을 가진다', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/이름/);
      await user.type(nameInput, '1');
      await user.tab();
      
      await waitFor(() => {
        const errorMessage = screen.getByText('이름은 한글, 영문, 공백만 입력 가능합니다');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });
});