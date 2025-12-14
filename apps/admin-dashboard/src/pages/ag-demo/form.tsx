/**
 * AGForm Demo Page
 *
 * Phase 7-C: Global Components Demo
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AGForm, AGFormSection, AGFormGrid } from '../../components/ag/form/AGForm';
import { AGFormField } from '../../components/ag/form/AGFormField';
import { AGFormActions } from '../../components/ag/form/AGFormActions';

interface DemoFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  department: string;
  bio: string;
  notifications: boolean;
  theme: string;
}

export default function FormDemo() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<DemoFormData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DemoFormData>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: '',
      department: '',
      bio: '',
      notifications: true,
      theme: 'system',
    },
  });

  const onSubmit = async (data: DemoFormData) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setSubmitted(data);
    alert('폼이 제출되었습니다!');
  };

  const handleCancel = () => {
    reset();
    setSubmitted(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AGForm 데모</h1>
        <p className="text-gray-500 mt-1">폼 컴포넌트 데모 페이지</p>
      </div>

      <AGForm
        title="사용자 정보"
        description="새 사용자를 등록하기 위한 정보를 입력하세요."
        loading={loading}
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* 기본 정보 섹션 */}
        <AGFormSection title="기본 정보">
          <AGFormGrid cols={2}>
            <AGFormField
              name="name"
              label="이름"
              placeholder="홍길동"
              required
              register={register}
              rules={{
                required: '이름을 입력해주세요',
                minLength: { value: 2, message: '2자 이상 입력해주세요' },
              }}
              error={errors.name}
            />

            <AGFormField
              name="email"
              type="email"
              label="이메일"
              placeholder="user@example.com"
              required
              register={register}
              rules={{
                required: '이메일을 입력해주세요',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '유효한 이메일 주소를 입력해주세요',
                },
              }}
              error={errors.email}
            />

            <AGFormField
              name="password"
              type="password"
              label="비밀번호"
              placeholder="********"
              required
              register={register}
              rules={{
                required: '비밀번호를 입력해주세요',
                minLength: { value: 8, message: '8자 이상 입력해주세요' },
              }}
              error={errors.password}
              helperText="8자 이상 입력해주세요"
            />

            <AGFormField
              name="phone"
              type="tel"
              label="전화번호"
              placeholder="010-1234-5678"
              register={register}
              rules={{
                pattern: {
                  value: /^[0-9-]+$/,
                  message: '유효한 전화번호를 입력해주세요',
                },
              }}
              error={errors.phone}
            />
          </AGFormGrid>
        </AGFormSection>

        {/* 소속 정보 섹션 */}
        <AGFormSection title="소속 정보" divider>
          <AGFormGrid cols={2}>
            <AGFormField
              name="role"
              type="select"
              label="역할"
              placeholder="역할 선택"
              required
              register={register}
              rules={{ required: '역할을 선택해주세요' }}
              error={errors.role}
              options={[
                { value: 'admin', label: '관리자' },
                { value: 'editor', label: '편집자' },
                { value: 'viewer', label: '뷰어' },
              ]}
            />

            <AGFormField
              name="department"
              type="select"
              label="부서"
              placeholder="부서 선택"
              register={register}
              options={[
                { value: 'dev', label: '개발팀' },
                { value: 'design', label: '디자인팀' },
                { value: 'marketing', label: '마케팅팀' },
                { value: 'sales', label: '영업팀' },
              ]}
            />
          </AGFormGrid>

          <AGFormField
            name="bio"
            type="textarea"
            label="자기소개"
            placeholder="간단한 자기소개를 입력해주세요"
            register={register}
            rows={4}
            className="mt-4"
          />
        </AGFormSection>

        {/* 설정 섹션 */}
        <AGFormSection title="설정" divider>
          <AGFormField
            name="notifications"
            type="checkbox"
            label="이메일 알림 수신"
            register={register}
            className="mb-4"
          />

          <AGFormField
            name="theme"
            type="radio"
            label="테마 설정"
            register={register}
            options={[
              { value: 'light', label: '라이트 모드' },
              { value: 'dark', label: '다크 모드' },
              { value: 'system', label: '시스템 설정' },
            ]}
          />
        </AGFormSection>

        {/* 액션 버튼 */}
        <AGFormActions
          submitLabel="저장"
          cancelLabel="취소"
          onCancel={handleCancel}
          loading={loading}
        />
      </AGForm>

      {/* 제출된 데이터 표시 */}
      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-medium mb-2">제출된 데이터:</h3>
          <pre className="text-sm text-green-700 overflow-auto">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
