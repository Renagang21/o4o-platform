import { authClient } from '@o4o/auth-client';

interface CopyVideoParams {
  postId: string;
  postType?: string;
}

interface CopyVideoResponse {
  success: boolean;
  newPostId?: string;
  message: string;
}

/**
 * 비디오 컨텐츠를 현재 사용자의 목록으로 복사
 */
export async function copyVideoToMyList(params: CopyVideoParams): Promise<CopyVideoResponse> {
  try {
    const response = await authClient.api.post('/v1/signage/copy-video', {
      postId: params.postId,
      postType: params.postType || 'signage_video',
    });

    return response.data;
  } catch (error: any) {
    console.error('Video copy error:', error);
    
    if (error.response?.status === 409) {
      return {
        success: false,
        message: '이미 내 목록에 있는 비디오입니다.',
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || '비디오 복사 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 비디오가 이미 내 목록에 있는지 확인
 */
export async function checkVideoInMyList(postId: string): Promise<boolean> {
  try {
    const response = await authClient.api.get(`/v1/signage/check-video/${postId}`);
    return response.data.exists || false;
  } catch (error) {
    console.error('Check video error:', error);
    return false;
  }
}

/**
 * 내 비디오 목록 가져오기
 */
export async function getMyVideoList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);

    const response = await authClient.api.get(`/v1/signage/my-videos?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Get my videos error:', error);
    return {
      success: false,
      data: [],
      message: '비디오 목록을 불러오는 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 비디오 정보 업데이트 (복사 후 수정용)
 */
export async function updateVideoInfo(postId: string, data: {
  title?: string;
  description?: string;
  videoUrl?: string;
  category?: string;
  displaySettings?: {
    duration?: number;
    transition?: string;
    schedule?: {
      startTime?: string;
      endTime?: string;
      days?: string[];
    };
  };
}) {
  try {
    const response = await authClient.api.put(`/v1/signage/videos/${postId}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Update video error:', error);
    return {
      success: false,
      message: error.response?.data?.message || '비디오 정보 수정 중 오류가 발생했습니다.',
    };
  }
}