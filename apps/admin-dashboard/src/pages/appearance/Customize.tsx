import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminFullscreen } from '@/hooks/useAdminFullscreen';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { SimpleCustomizer } from './astra-customizer/SimpleCustomizer';
import { AstraCustomizerSettings } from './astra-customizer/types/customizer-types';
import { normalizeCustomizerSettings } from './astra-customizer/utils/normalize-settings';
import { errorHandler, ErrorLevel } from './astra-customizer/utils/error-handler';

const Customize: React.FC = () => {
  const navigate = useNavigate();
  const adminFullscreen = useAdminFullscreen();
  const [initialSettings, setInitialSettings] = useState<AstraCustomizerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 실제 사이트 URL 동적 설정 (관리자 도메인에서 admin 제거)
  const getSitePreviewUrl = () => {
    const currentHost = window.location.host;
    const protocol = window.location.protocol;

    // admin.neture.co.kr -> neture.co.kr 같은 변환
    if (currentHost.startsWith('admin.')) {
      return `${protocol}//${currentHost.replace('admin.', '')}`;
    }

    // 기타 경우는 환경변수에서 가져오기
    return import.meta.env.VITE_SITE_URL || `${protocol}//${currentHost}`;
  };
  
  // 설정 불러오기 함수 (프리셋 적용 후 재사용 가능)
  const loadSettings = async () => {
    try {
      setIsLoading(true);

      const response = await authClient.api.get('/settings/customizer');

      if (response.data?.success && response.data?.data) {
        // API 응답 구조 정규화:
        // Case 1: { success: true, data: { settings: {...} } }
        // Case 2: { success: true, data: {...} }
        const rawData = response.data.data;
        const settingsData = rawData.settings || rawData;

        // normalize 함수가 AstraCustomizerSettings 반환
        const normalized = normalizeCustomizerSettings(settingsData);
        setInitialSettings(normalized);
      } else {
        // 설정이 없으면 기본값 사용
        setInitialSettings(normalizeCustomizerSettings(null));
      }
    } catch (error: any) {
      // 에러 시 기본값 사용
      setInitialSettings(normalizeCustomizerSettings(null));
      errorHandler.handleApiError(error, 'Settings Load');
    } finally {
      setIsLoading(false);
    }
  };

  // 설정 불러오기
  useEffect(() => {
    loadSettings();
  }, []);

  // 풀스크린 모드 관리
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('customizer-fullscreen');
    }
    // Manage fullscreen state
    adminFullscreen.enter('customize');
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('customizer-fullscreen');
      }
      adminFullscreen.exit();
    };
  }, []);
  
  const handleClose = () => {
    navigate('/admin');
  };
  
  const handleSave = async (settings: any) => {
    try {
      // SIMPLIFIED: Just save the settings as-is (no complex normalization)
      // The normalize function was causing issues - keep it simple
      const response = await authClient.api.put('/settings/customizer', { settings });

      if (response.data?.success) {
        setInitialSettings(settings);
        toast.success('설정이 저장되었습니다.');
        return true;
      }

      const errorMsg = response.data?.error || response.data?.message || '알 수 없는 오류가 발생했습니다';
      toast.error(`저장 실패: ${errorMsg}`);
      return false;
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const errorCode = error?.response?.data?.code;

      if (statusCode === 401 || statusCode === 403) {
        if (errorCode === 'USER_NOT_AUTHENTICATED') {
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          setTimeout(() => navigate('/login'), 2000);
        } else if (errorCode === 'INSUFFICIENT_PERMISSIONS') {
          toast.error('설정을 저장할 권한이 없습니다.');
        } else {
          toast.error('권한 오류가 발생했습니다.');
        }
      } else {
        const errorMsg = error?.response?.data?.message || error?.message || '저장 중 오류가 발생했습니다';
        toast.error(errorMsg);
      }

      return false;
    }
  };
  
  // 로딩 중
  if (isLoading || !initialSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">사용자 정의 설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <SimpleCustomizer
      onClose={handleClose}
      previewUrl={getSitePreviewUrl()}
      siteName="Neture Platform"
      onSave={handleSave}
      onReloadSettings={loadSettings}
      initialSettings={initialSettings}
    />
  );
};

export default Customize;
