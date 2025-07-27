import React from "react"
/**
 * UserForm - 공통 사용자 폼 컴포넌트
 * React Hook Form + Zod를 사용한 유효성 검증
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  ROLE_LABELS,
  STATUS_LABELS,
  BUSINESS_TYPES
} from '../../types/user';
import {
  AlertTriangle,
  Save,
  X,
  Eye,
  EyeOff,
  Building,
  Mail,
  UserIcon,
  Shield,
  Phone,
  MapPin
} from 'lucide-react';

// Zod 스키마 정의
const userFormSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 입력 가능합니다'),
  
  email: z
    .string()
    .email('올바른 이메일 형식을 입력해주세요')
    .min(5, '이메일은 최소 5자 이상이어야 합니다')
    .max(100, '이메일은 최대 100자까지 가능합니다'),
  
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(50, '비밀번호는 최대 50자까지 가능합니다')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      '비밀번호는 대문자, 소문자, 숫자와 특수문자를 포함해야 합니다')
    .optional(),
  
  role: z.enum(['admin', 'customer', 'business', 'affiliate']).refine(val => val !== undefined, {
    message: '역할을 선택해주세요'
  }),
  
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).refine(val => val !== undefined, {
    message: '상태를 선택해주세요'
  }),
  
  phone: z
    .string()
    .regex(/^01[0-9]-\d{3,4}-\d{4}$/, '올바른 휴대폰 번호 형식을 입력해주세요 (예: 010-1234-5678)')
    .optional()
    .or(z.literal('')),
  
  // 사업자 정보 (선택적)
  businessInfo: z.object({
    businessName: z
      .string()
      .min(2, '사업자명은 최소 2자 이상이어야 합니다')
      .max(100, '사업자명은 최대 100자까지 가능합니다')
      .optional()
      .or(z.literal('')),
    
    businessType: z
      .string()
      .optional(),
    
    businessNumber: z
      .string()
      .regex(/^\d{3}-\d{2}-\d{5}$/, '올바른 사업자등록번호 형식을 입력해주세요 (예: 123-45-67890)')
      .optional()
      .or(z.literal('')),
    
    businessAddress: z
      .string()
      .max(200, '사업장 주소는 최대 200자까지 가능합니다')
      .optional()
      .or(z.literal('')),
    
    representativeName: z
      .string()
      .max(50, '대표자명은 최대 50자까지 가능합니다')
      .optional()
      .or(z.literal('')),
    
    contactPhone: z
      .string()
      .regex(/^0\d{1,2}-\d{3,4}-\d{4}$/, '올바른 연락처 형식을 입력해주세요 (예: 02-1234-5678)')
      .optional()
      .or(z.literal(''))
  }).optional(),
  
  sendWelcomeEmail: z.boolean().optional()
});

export type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<User>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  className = ''
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showBusinessFields, setShowBusinessFields] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty },
    reset
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || 'customer',
      status: initialData?.status || 'pending',
      phone: initialData?.phone || '',
      businessInfo: {
        businessName: initialData?.businessInfo?.businessName || '',
        businessType: initialData?.businessInfo?.businessType || '',
        businessNumber: initialData?.businessInfo?.businessNumber || '',
        businessAddress: initialData?.businessInfo?.businessAddress || '',
        representativeName: initialData?.businessInfo?.representativeName || '',
        contactPhone: initialData?.businessInfo?.contactPhone || ''
      },
      sendWelcomeEmail: true
    }
  });

  const selectedRole = watch('role');

  // 사업자 역할 선택 시 사업자 정보 필드 표시
  useEffect(() => {
    setShowBusinessFields(selectedRole === 'business');
  }, [selectedRole]);

  // 초기 데이터 설정 시 폼 리셋
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '',
        role: initialData.role || 'customer',
        status: initialData.status || 'pending',
        phone: initialData.phone || '',
        businessInfo: {
          businessName: initialData.businessInfo?.businessName || '',
          businessType: initialData.businessInfo?.businessType || '',
          businessNumber: initialData.businessInfo?.businessNumber || '',
          businessAddress: initialData.businessInfo?.businessAddress || '',
          representativeName: initialData.businessInfo?.representativeName || '',
          contactPhone: initialData.businessInfo?.contactPhone || ''
        },
        sendWelcomeEmail: mode === 'create'
      });
    }
  }, [initialData, mode, reset]);

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      // 비밀번호 필드가 비어있으면 제거 (수정 모드)
      if (mode === 'edit' && !data.password) {
        delete data.password;
      }

      // 사업자가 아닌 경우 사업자 정보 제거
      if (data.role !== 'business') {
        delete data.businessInfo;
      }

      await onSubmit(data);
    } catch (error: any) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* 기본 정보 섹션 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
              기본 정보
            </h3>
            <p className="text-sm text-wp-text-secondary">사용자의 기본 정보를 입력하세요</p>
          </div>
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-wp-text-primary mb-2">
                  <span className="text-red-500">*</span> 이름
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className={`wp-input-field ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="사용자 이름을 입력하세요"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-wp-text-primary mb-2">
                  <span className="text-red-500">*</span> 이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-wp-text-secondary w-4 h-4" />
                  <input
                    type="email"
                    {...register('email')}
                    className={`wp-input-field pl-10 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="user@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* 비밀번호 (생성 모드에서 필수, 수정 모드에서 선택) */}
              <div>
                <label className="block text-sm font-medium text-wp-text-primary mb-2">
                  {mode === 'create' && <span className="text-red-500">*</span>} 
                  비밀번호 {mode === 'edit' && <span className="text-sm text-wp-text-secondary">(변경 시에만 입력)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`wp-input-field pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder={mode === 'create' ? '비밀번호를 입력하세요' : '새로운 비밀번호 (선택사항)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-wp-text-secondary hover:text-wp-text-secondary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 휴대폰 번호 */}
              <div>
                <label className="block text-sm font-medium text-wp-text-primary mb-2">
                  휴대폰 번호
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-wp-text-secondary w-4 h-4" />
                  <input
                    type="tel"
                    {...register('phone')}
                    className={`wp-input-field pl-10 ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="010-1234-5678"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 권한 및 상태 섹션 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-600" />
              권한 및 상태
            </h3>
            <p className="text-sm text-wp-text-secondary">사용자의 역할과 계정 상태를 설정하세요</p>
          </div>
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 역할 */}
              <div>
                <label className="block text-sm font-medium text-wp-text-primary mb-2">
                  <span className="text-red-500">*</span> 역할
                </label>
                <select
                  {...register('role')}
                  className={`wp-input-field ${errors.role ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* 상태 */}
              <div>
                <label className="block text-sm font-medium text-wp-text-primary mb-2">
                  <span className="text-red-500">*</span> 상태
                </label>
                <select
                  {...register('status')}
                  className={`wp-input-field ${errors.status ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.status.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 사업자 정보 섹션 (사업자 역할 선택 시에만 표시) */}
        {showBusinessFields && (
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title flex items-center">
                <Building className="w-5 h-5 mr-2 text-green-600" />
                사업자 정보
              </h3>
              <p className="text-sm text-wp-text-secondary">사업자 관련 정보를 입력하세요</p>
            </div>
            <div className="wp-card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 사업자명 */}
                <div>
                  <label className="block text-sm font-medium text-wp-text-primary mb-2">
                    사업자명
                  </label>
                  <input
                    type="text"
                    {...register('businessInfo.businessName')}
                    className={`wp-input-field ${errors.businessInfo?.businessName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="사업자명을 입력하세요"
                  />
                  {errors.businessInfo?.businessName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.businessInfo.businessName.message}
                    </p>
                  )}
                </div>

                {/* 사업자 유형 */}
                <div>
                  <label className="block text-sm font-medium text-wp-text-primary mb-2">
                    사업자 유형
                  </label>
                  <select
                    {...register('businessInfo.businessType')}
                    className="wp-input-field"
                  >
                    <option value="">사업자 유형 선택</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 사업자등록번호 */}
                <div>
                  <label className="block text-sm font-medium text-wp-text-primary mb-2">
                    사업자등록번호
                  </label>
                  <input
                    type="text"
                    {...register('businessInfo.businessNumber')}
                    className={`wp-input-field ${errors.businessInfo?.businessNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="123-45-67890"
                  />
                  {errors.businessInfo?.businessNumber && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.businessInfo.businessNumber.message}
                    </p>
                  )}
                </div>

                {/* 대표자명 */}
                <div>
                  <label className="block text-sm font-medium text-wp-text-primary mb-2">
                    대표자명
                  </label>
                  <input
                    type="text"
                    {...register('businessInfo.representativeName')}
                    className={`wp-input-field ${errors.businessInfo?.representativeName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="대표자명을 입력하세요"
                  />
                  {errors.businessInfo?.representativeName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.businessInfo.representativeName.message}
                    </p>
                  )}
                </div>

                {/* 사업장 주소 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-wp-text-primary mb-2">
                    사업장 주소
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-wp-text-secondary w-4 h-4" />
                    <input
                      type="text"
                      {...register('businessInfo.businessAddress')}
                      className={`wp-input-field pl-10 ${errors.businessInfo?.businessAddress ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="사업장 주소를 입력하세요"
                    />
                  </div>
                  {errors.businessInfo?.businessAddress && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.businessInfo.businessAddress.message}
                    </p>
                  )}
                </div>

                {/* 연락처 */}
                <div>
                  <label className="block text-sm font-medium text-wp-text-primary mb-2">
                    사업장 연락처
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-wp-text-secondary w-4 h-4" />
                    <input
                      type="tel"
                      {...register('businessInfo.contactPhone')}
                      className={`wp-input-field pl-10 ${errors.businessInfo?.contactPhone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="02-1234-5678"
                    />
                  </div>
                  {errors.businessInfo?.contactPhone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {errors.businessInfo.contactPhone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추가 옵션 (생성 모드에서만) */}
        {mode === 'create' && (
          <div className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('sendWelcomeEmail')}
                  id="sendWelcomeEmail"
                  className="rounded border border-gray-200 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sendWelcomeEmail" className="ml-2 text-sm text-wp-text-primary">
                  환영 메시지 이메일 발송
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 폼 액션 버튼 */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="wp-button wp-button-secondary"
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            취소
          </button>
          <button
            type="submit"
            className="wp-button wp-button-primary"
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {mode === 'create' ? '사용자 생성' : '변경사항 저장'}
          </button>
        </div>

        {/* 폼 상태 표시 (개발 환경) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-wp-bg-tertiary rounded text-xs">
            <p>폼 상태: {isValid ? '유효' : '유효하지 않음'} | 변경됨: {isDirty ? 'Y' : 'N'}</p>
            {Object.keys(errors).length > 0 && (
              <p className="text-red-600 mt-1">
                오류: {Object.keys(errors).join(', ')}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default UserForm;