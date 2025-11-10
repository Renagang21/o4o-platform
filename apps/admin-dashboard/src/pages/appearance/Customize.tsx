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
      // Normalize settings: sanitize numeric keys + convert legacy formats + merge defaults
      // This ensures clean data structure and prevents "contaminated data" errors
      const normalized = normalizeCustomizerSettings(settings);

      // API를 통해 설정 저장 (PUT 메서드 사용)
      // 서버는 { settings: {...} } 형식을 기대함
      const response = await authClient.api.put('/settings/customizer', { settings: normalized });

      if (response.data?.success) {
        // CRITICAL: Update local state with normalized settings (no re-fetch)
        // This prevents state inconsistencies and unnecessary API calls
        setInitialSettings(normalized);
        toast.success('설정이 저장되었습니다.');
        return true;
      }

      // 🔧 FIX: Show detailed error message to user
      const errorMsg = response.data?.error || response.data?.message || '알 수 없는 오류가 발생했습니다';
      errorHandler.log(`설정 저장 실패: ${errorMsg}`, ErrorLevel.WARNING, 'Settings');
      toast.error(`저장 실패: ${errorMsg}`);
      console.error('Save failed - Response:', response.data);
      return false;
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const errorCode = error?.response?.data?.code;

      // 인증 에러 처리
      if (statusCode === 401 || statusCode === 403) {
        if (errorCode === 'USER_NOT_AUTHENTICATED') {
          errorHandler.log('세션 만료', ErrorLevel.WARNING, 'Settings Save');
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (errorCode === 'INSUFFICIENT_PERMISSIONS') {
          errorHandler.log('권한 부족', ErrorLevel.WARNING, 'Settings Save');
          toast.error('설정을 저장할 권한이 없습니다.');
        } else {
          errorHandler.handleApiError(error, 'Settings Save');
        }
      } else {
        errorHandler.handleApiError(error, 'Settings Save');
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
