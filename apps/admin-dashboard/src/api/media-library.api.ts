/**
 * Media Library Upload API
 *
 * WO-STORE-IMAGE-PASTE-SUPPORT-V1
 *
 * 에디터 이미지 붙여넣기·업로드 공통 헬퍼.
 * POST /api/v1/platform/media-library/upload 를 호출한다.
 * - consent: 'true' 자동 포함 (에디터에 직접 붙여넣거나 선택하는 행위 = 묵시적 동의)
 * - folder: 콘텐츠 유형별 자동 분류 (blog / product / pop / qr / general)
 */

import { authClient } from '@o4o/auth-client';

/**
 * 파일을 공용 미디어 라이브러리에 업로드하고 URL을 반환한다.
 *
 * @param file   업로드할 이미지 파일
 * @param folder 저장 폴더 (기본값: 'general')
 * @returns      GCS 공개 URL
 * @throws       업로드 실패 시 Error
 */
export async function uploadImageForEditor(
  file: File,
  folder: string = 'general',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('consent', 'true');
  formData.append('folder', folder);

  const res = await authClient.api.post<{ success: boolean; data?: { url: string }; error?: string }>(
    '/platform/media-library/upload',
    formData,
  );

  if (!res.data?.success || !res.data?.data?.url) {
    throw new Error(res.data?.error || '이미지 업로드에 실패했습니다.');
  }
  return res.data.data.url;
}
